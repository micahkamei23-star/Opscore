import { getDb } from "@/infrastructure/db/connection";


import type { Habit, HabitCompletion } from "@/core/entities/types";
import { calculateStreaks } from "@/core/rules/calculations";

import { initDatabase } from "@/infrastructure/db/init";

function ensureInit() {
  initDatabase();
}

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    category: row.category as Habit["category"],
    schedule: JSON.parse(row.schedule as string),
    targetStreak: row.target_streak as number,
    currentStreak: row.current_streak as number,
    longestStreak: row.longest_streak as number,
    totalCompletions: row.total_completions as number,
    skillId: row.skill_id as string | null,
    xpPerCompletion: row.xp_per_completion as number,
    color: row.color as string,
    icon: row.icon as string,
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function rowToCompletion(row: Record<string, unknown>): HabitCompletion {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    userId: row.user_id as string,
    date: row.date as string,
    completedAt: row.completed_at as number,
    notes: row.notes as string | null,
    xpEarned: row.xp_earned as number,
  };
}

export const habitsRepository = {
  getHabits(userId: string): Habit[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM habits WHERE user_id = ? AND is_archived = 0 ORDER BY created_at ASC")
      .all(userId) as Record<string, unknown>[];
    return rows.map(rowToHabit);
  },

  getHabitById(id: string): Habit | null {
    ensureInit();
    const db = getDb();
    const row = db.prepare("SELECT * FROM habits WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? rowToHabit(row) : null;
  },

  createHabit(habit: Habit): Habit {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO habits (id, user_id, name, description, category, schedule, target_streak, current_streak, longest_streak, total_completions, skill_id, xp_per_completion, color, icon, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(habit.id, habit.userId, habit.name, habit.description, habit.category, JSON.stringify(habit.schedule), habit.targetStreak, habit.currentStreak, habit.longestStreak, habit.totalCompletions, habit.skillId, habit.xpPerCompletion, habit.color, habit.icon, habit.isArchived ? 1 : 0, habit.createdAt, habit.updatedAt);
    return habit;
  },

  updateHabit(habit: Habit): Habit {
    ensureInit();
    const db = getDb();
    db.prepare(`
      UPDATE habits SET name=?, description=?, category=?, schedule=?, target_streak=?, current_streak=?, longest_streak=?, total_completions=?, skill_id=?, xp_per_completion=?, color=?, icon=?, is_archived=?, updated_at=?
      WHERE id=?
    `).run(habit.name, habit.description, habit.category, JSON.stringify(habit.schedule), habit.targetStreak, habit.currentStreak, habit.longestStreak, habit.totalCompletions, habit.skillId, habit.xpPerCompletion, habit.color, habit.icon, habit.isArchived ? 1 : 0, habit.updatedAt, habit.id);
    return habit;
  },

  getCompletions(habitId: string, limit = 90): HabitCompletion[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM habit_completions WHERE habit_id = ? ORDER BY date DESC LIMIT ?")
      .all(habitId, limit) as Record<string, unknown>[];
    return rows.map(rowToCompletion);
  },

  getCompletionsForUser(userId: string, since: string): HabitCompletion[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM habit_completions WHERE user_id = ? AND date >= ? ORDER BY date DESC")
      .all(userId, since) as Record<string, unknown>[];
    return rows.map(rowToCompletion);
  },

  isCompletedToday(habitId: string): boolean {
    ensureInit();
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const row = db
      .prepare("SELECT id FROM habit_completions WHERE habit_id = ? AND date = ?")
      .get(habitId, today);
    return row != null;
  },

  createCompletion(completion: HabitCompletion): HabitCompletion {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO habit_completions (id, habit_id, user_id, date, completed_at, notes, xp_earned)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(completion.id, completion.habitId, completion.userId, completion.date, completion.completedAt, completion.notes, completion.xpEarned);
    return completion;
  },

  recalculateStreaks(habit: Habit): Habit {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT date FROM habit_completions WHERE habit_id = ? ORDER BY date ASC")
      .all(habit.id) as Array<{ date: string }>;
    const dates = rows.map((r) => r.date);
    const { currentStreak, longestStreak } = calculateStreaks(dates, habit);
    const updated: Habit = { ...habit, currentStreak, longestStreak, updatedAt: Date.now() };
    this.updateHabit(updated);
    return updated;
  },
};
