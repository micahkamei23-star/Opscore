import { NextRequest, NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";
import { tasksRepository } from "@/infrastructure/repositories/tasksRepository";
import { habitsRepository } from "@/infrastructure/repositories/habitsRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { sessionsRepository } from "@/infrastructure/repositories/sessionsRepository";
import { getDb } from "@/infrastructure/db/connection";
import { initDatabase } from "@/infrastructure/db/init";
import type { DashboardStats, TimePeriod } from "@/core/entities/types";

export async function GET(req: NextRequest) {
  initDatabase();

  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const period = (req.nextUrl.searchParams.get("period") ?? "week") as TimePeriod;

  const today = new Date().toISOString().split("T")[0];
  const db = getDb();

  // Determine date range
  const days = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days + 1);
  const sinceStr = sinceDate.toISOString().split("T")[0];

  // Fitness stats
  const fitnessStats = fitnessRepository.getWorkoutStats(userId, days);

  // Task stats
  const taskStats = tasksRepository.getTaskStats(userId);
  const tasks = tasksRepository.getTasks(userId);
  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const taskCompletionRate = tasks.length > 0 ? doneTasks.length / tasks.length : 0;

  // Habit stats
  const habits = habitsRepository.getHabits(userId);
  const habitCompletions = habitsRepository.getCompletionsForUser(userId, sinceStr);
  const habitsDueToday = habits.filter((h) => !h.isArchived);
  const habitsCompletedToday = habitsDueToday.filter((h) =>
    habitCompletions.some((c) => c.habitId === h.id && c.date === today)
  );
  const habitCompletionRate = habitsDueToday.length > 0
    ? habitsCompletedToday.length / habitsDueToday.length
    : 0;
  const activeStreaks = habits.filter((h) => h.currentStreak > 0).length;

  // Session stats
  const sessionStats = sessionsRepository.getSessionStats(userId, days);

  // Skills
  const skills = skillsRepository.getSkills(userId);
  const xpEvents = skillsRepository.getXPEventsForUser(userId, Date.now() - days * 86400000);

  const skillXPMap = new Map<string, number>();
  for (const event of xpEvents) {
    skillXPMap.set(event.skillId, (skillXPMap.get(event.skillId) ?? 0) + event.amount);
  }

  const totalXP = Array.from(skillXPMap.values()).reduce((a, b) => a + b, 0);
  const topSkills = skills
    .map((skill) => ({ skill, xpGained: skillXPMap.get(skill.id) ?? 0 }))
    .filter((s) => s.xpGained > 0)
    .sort((a, b) => b.xpGained - a.xpGained)
    .slice(0, 5);

  // Build chart data for workouts (last 30 days)
  const workoutChartData = db
    .prepare(`
      SELECT date, SUM(total_volume) as volume, SUM(duration_minutes) as duration
      FROM workouts
      WHERE user_id = ? AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    .all(userId, sinceStr) as Array<{ date: string; volume: number; duration: number }>;

  // Build chart data for habits
  const habitChartData = db
    .prepare(`
      SELECT date, COUNT(*) as completions
      FROM habit_completions
      WHERE user_id = ? AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    .all(userId, sinceStr) as Array<{ date: string; completions: number }>;

  // XP chart data
  const xpChartData = db
    .prepare(`
      SELECT date(timestamp/1000, 'unixepoch') as date, SUM(amount) as xp
      FROM xp_events
      WHERE user_id = ? AND timestamp >= ?
      GROUP BY date(timestamp/1000, 'unixepoch')
      ORDER BY date ASC
    `)
    .all(userId, Date.now() - days * 86400000) as Array<{ date: string; xp: number }>;

  const stats: DashboardStats & {
    taskStats: typeof taskStats;
    skills: typeof skills;
    chartData: {
      workouts: typeof workoutChartData;
      habits: typeof habitChartData;
      xp: typeof xpChartData;
    };
    habits: typeof habits;
    recentWorkouts: ReturnType<typeof fitnessRepository.getWorkouts>;
    activeTasks: typeof activeTasks;
  } = {
    period,
    date: today,
    totalXP,
    taskCompletionRate,
    habitCompletionRate,
    workoutsCompleted: fitnessStats.totalWorkouts,
    focusHours: Math.round(sessionStats.totalFocusMinutes / 60 * 10) / 10,
    activeStreaks,
    topSkills,
    fitnessVolume: fitnessStats.totalVolume,
    averageSessionLength: sessionStats.avgSessionLength,
    taskStats,
    skills,
    habits,
    chartData: {
      workouts: workoutChartData,
      habits: habitChartData,
      xp: xpChartData,
    },
    recentWorkouts: fitnessRepository.getWorkouts(userId, 5),
    activeTasks: activeTasks.slice(0, 5),
  };

  return NextResponse.json(stats);
}
