import { getDb } from "./connection";
import { runMigrations } from "./schema";
import type {
  User,
  Exercise,
  Workout,
  BodyweightEntry,
  Skill,
  Task,
  Habit,
  HabitCompletion,
  FocusSession,
  XPEvent,
} from "@/core/entities/types";
import { xpForNextLevel, applyXPToSkill } from "@/core/rules/calculations";

export function seedDatabase(): void {
  const db = getDb();
  runMigrations();

  // Check if already seeded
  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (userCount > 0) return;

  const now = Date.now();
  const userId = "user_seed_001";

  // ─── User ───────────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, "Alex Chen", "alex@opscore.io", null, now, now);

  // ─── Exercises ────────────────────────────────────────────────────────────
  const exercises: Exercise[] = [
    { id: "ex_001", name: "Bench Press", muscleGroups: ["chest", "triceps", "shoulders"], equipmentRequired: true, isCompound: true, notes: null },
    { id: "ex_002", name: "Squat", muscleGroups: ["legs", "glutes", "core"], equipmentRequired: true, isCompound: true, notes: null },
    { id: "ex_003", name: "Deadlift", muscleGroups: ["back", "legs", "glutes"], equipmentRequired: true, isCompound: true, notes: null },
    { id: "ex_004", name: "Pull-Up", muscleGroups: ["back", "biceps"], equipmentRequired: false, isCompound: true, notes: null },
    { id: "ex_005", name: "Overhead Press", muscleGroups: ["shoulders", "triceps"], equipmentRequired: true, isCompound: true, notes: null },
    { id: "ex_006", name: "Barbell Row", muscleGroups: ["back", "biceps"], equipmentRequired: true, isCompound: true, notes: null },
    { id: "ex_007", name: "Dumbbell Curl", muscleGroups: ["biceps"], equipmentRequired: true, isCompound: false, notes: null },
    { id: "ex_008", name: "Running", muscleGroups: ["cardio", "legs"], equipmentRequired: false, isCompound: false, notes: null },
    { id: "ex_009", name: "Plank", muscleGroups: ["core"], equipmentRequired: false, isCompound: false, notes: null },
    { id: "ex_010", name: "Romanian Deadlift", muscleGroups: ["legs", "glutes", "back"], equipmentRequired: true, isCompound: true, notes: null },
  ];

  const insertExercise = db.prepare(`
    INSERT OR IGNORE INTO exercises (id, name, muscle_groups, equipment_required, is_compound, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const ex of exercises) {
    insertExercise.run(ex.id, ex.name, JSON.stringify(ex.muscleGroups), ex.equipmentRequired ? 1 : 0, ex.isCompound ? 1 : 0, ex.notes);
  }

  // ─── Skills ─────────────────────────────────────────────────────────────────
  const skills: Array<Omit<Skill, "updatedAt">> = [
    { id: "skill_001", userId, name: "Strength Training", description: "Compound lifting and progressive overload", category: "physical", level: 8, currentXP: 640, totalXP: 8640, xpToNextLevel: 900, progressionModel: "linear", color: "#f59e0b", icon: "💪", createdAt: now },
    { id: "skill_002", userId, name: "Software Engineering", description: "Building systems and writing clean code", category: "technical", level: 12, currentXP: 320, totalXP: 18320, xpToNextLevel: 1300, progressionModel: "exponential", color: "#6366f1", icon: "⚡", createdAt: now },
    { id: "skill_003", userId, name: "Deep Work", description: "Focused concentration and flow state", category: "mental", level: 6, currentXP: 180, totalXP: 5180, xpToNextLevel: 700, progressionModel: "linear", color: "#0ea5e9", icon: "🧠", createdAt: now },
    { id: "skill_004", userId, name: "Running", description: "Cardiovascular endurance and pace improvement", category: "physical", level: 4, currentXP: 85, totalXP: 1685, xpToNextLevel: 500, progressionModel: "fibonacci", color: "#10b981", icon: "🏃", createdAt: now },
    { id: "skill_005", userId, name: "Leadership", description: "Team building and strategic thinking", category: "leadership", level: 5, currentXP: 210, totalXP: 3210, xpToNextLevel: 600, progressionModel: "linear", color: "#ec4899", icon: "👑", createdAt: now },
  ];

  const insertSkill = db.prepare(`
    INSERT OR IGNORE INTO skills (id, user_id, name, description, category, level, current_xp, total_xp, xp_to_next_level, progression_model, color, icon, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of skills) {
    insertSkill.run(s.id, s.userId, s.name, s.description, s.category, s.level, s.currentXP, s.totalXP, s.xpToNextLevel, s.progressionModel, s.color, s.icon, s.createdAt, s.createdAt);
  }

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  const tasks: Task[] = [
    { id: "task_001", userId, title: "Build REST API endpoints", description: "Create all necessary API routes for the backend", status: "done", priority: "high", category: "work", dueDate: fmtDate(-3), completedAt: now - 86400000 * 3, estimatedMinutes: 120, actualMinutes: 105, tags: ["backend", "api"], skillId: "skill_002", xpReward: 60, createdAt: now - 86400000 * 7, updatedAt: now - 86400000 * 3 },
    { id: "task_002", userId, title: "Complete morning run 5k", description: null, status: "done", priority: "medium", category: "fitness", dueDate: fmtDate(-1), completedAt: now - 86400000, estimatedMinutes: 30, actualMinutes: 28, tags: ["cardio"], skillId: "skill_004", xpReward: 40, createdAt: now - 86400000 * 2, updatedAt: now - 86400000 },
    { id: "task_003", userId, title: "Design system architecture review", description: "Review the current architecture and identify bottlenecks", status: "in_progress", priority: "critical", category: "work", dueDate: fmtDate(1), completedAt: null, estimatedMinutes: 90, actualMinutes: null, tags: ["architecture", "review"], skillId: "skill_002", xpReward: 80, createdAt: now - 86400000, updatedAt: now - 3600000 },
    { id: "task_004", userId, title: "Read 'Atomic Habits'", description: "Complete chapters 8-12", status: "todo", priority: "medium", category: "learning", dueDate: fmtDate(3), completedAt: null, estimatedMinutes: 60, actualMinutes: null, tags: ["books", "habits"], skillId: null, xpReward: 30, createdAt: now - 3600000, updatedAt: now - 3600000 },
    { id: "task_005", userId, title: "Weekly team sync prep", description: "Prepare agenda and action items", status: "todo", priority: "high", category: "work", dueDate: fmtDate(0), completedAt: null, estimatedMinutes: 20, actualMinutes: null, tags: ["meetings"], skillId: "skill_005", xpReward: 40, createdAt: now - 7200000, updatedAt: now - 7200000 },
    { id: "task_006", userId, title: "Meal prep for the week", description: null, status: "todo", priority: "medium", category: "health", dueDate: fmtDate(0), completedAt: null, estimatedMinutes: 90, actualMinutes: null, tags: ["nutrition"], skillId: null, xpReward: 30, createdAt: now, updatedAt: now },
  ];

  const insertTask = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, user_id, title, description, status, priority, category, due_date, completed_at, estimated_minutes, actual_minutes, tags, skill_id, xp_reward, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of tasks) {
    insertTask.run(t.id, t.userId, t.title, t.description, t.status, t.priority, t.category, t.dueDate, t.completedAt, t.estimatedMinutes, t.actualMinutes, JSON.stringify(t.tags), t.skillId, t.xpReward, t.createdAt, t.updatedAt);
  }

  // ─── Habits ──────────────────────────────────────────────────────────────────
  const habits: Habit[] = [
    { id: "habit_001", userId, name: "Morning Workout", description: "45 min strength or cardio session", category: "fitness", schedule: { frequency: "daily", daysOfWeek: [0,1,2,3,4,5,6], timesPerPeriod: 1 }, targetStreak: 30, currentStreak: 12, longestStreak: 21, totalCompletions: 45, skillId: "skill_001", xpPerCompletion: 25, color: "#f59e0b", icon: "🏋️", isArchived: false, createdAt: now - 86400000 * 60, updatedAt: now },
    { id: "habit_002", userId, name: "Read 30 minutes", description: "Non-fiction or technical books", category: "learning", schedule: { frequency: "daily", daysOfWeek: [0,1,2,3,4,5,6], timesPerPeriod: 1 }, targetStreak: 60, currentStreak: 7, longestStreak: 14, totalCompletions: 28, skillId: null, xpPerCompletion: 15, color: "#6366f1", icon: "📚", isArchived: false, createdAt: now - 86400000 * 45, updatedAt: now },
    { id: "habit_003", userId, name: "Cold shower", description: "2-3 minute cold exposure", category: "health", schedule: { frequency: "daily", daysOfWeek: [0,1,2,3,4,5,6], timesPerPeriod: 1 }, targetStreak: 30, currentStreak: 19, longestStreak: 19, totalCompletions: 31, skillId: "skill_003", xpPerCompletion: 10, color: "#0ea5e9", icon: "🚿", isArchived: false, createdAt: now - 86400000 * 35, updatedAt: now },
    { id: "habit_004", userId, name: "Journaling", description: "Morning pages or evening reflection", category: "personal", schedule: { frequency: "daily", daysOfWeek: [0,1,2,3,4,5,6], timesPerPeriod: 1 }, targetStreak: 30, currentStreak: 4, longestStreak: 9, totalCompletions: 18, skillId: "skill_003", xpPerCompletion: 15, color: "#8b5cf6", icon: "✍️", isArchived: false, createdAt: now - 86400000 * 30, updatedAt: now },
    { id: "habit_005", userId, name: "Weekly code review", description: "Review PRs and contribute to open source", category: "work", schedule: { frequency: "weekly", daysOfWeek: [5], timesPerPeriod: 1 }, targetStreak: 12, currentStreak: 5, longestStreak: 8, totalCompletions: 15, skillId: "skill_002", xpPerCompletion: 40, color: "#10b981", icon: "💻", isArchived: false, createdAt: now - 86400000 * 90, updatedAt: now },
  ];

  const insertHabit = db.prepare(`
    INSERT OR IGNORE INTO habits (id, user_id, name, description, category, schedule, target_streak, current_streak, longest_streak, total_completions, skill_id, xp_per_completion, color, icon, is_archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const h of habits) {
    insertHabit.run(h.id, h.userId, h.name, h.description, h.category, JSON.stringify(h.schedule), h.targetStreak, h.currentStreak, h.longestStreak, h.totalCompletions, h.skillId, h.xpPerCompletion, h.color, h.icon, h.isArchived ? 1 : 0, h.createdAt, h.updatedAt);
  }

  // Habit completions (last 14 days) - use deterministic IDs: hc_{habitId}_{date}
  const insertCompletion = db.prepare(`
    INSERT OR IGNORE INTO habit_completions (id, habit_id, user_id, date, completed_at, notes, xp_earned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const habitStreakDays = { habit_001: 12, habit_002: 7, habit_003: 19, habit_004: 4, habit_005: 0 };
  for (const [habitId, streakDays] of Object.entries(habitStreakDays)) {
    for (let d = 0; d < Math.min(streakDays, 14); d++) {
      const date = fmtDate(-d);
      const habit = habits.find((h) => h.id === habitId)!;
      insertCompletion.run(
        `hc_${habitId}_${date}`,
        habitId,
        userId,
        date,
        now - d * 86400000 + 32400000, // 9am offset
        null,
        habit.xpPerCompletion
      );
    }
  }

  // ─── Workouts ────────────────────────────────────────────────────────────────
  const workoutData = [
    {
      id: "workout_001",
      date: fmtDate(-1),
      name: "Upper Body Power",
      durationMinutes: 60,
      perceivedExertion: 8,
      sets: [
        { exerciseId: "ex_001", exerciseName: "Bench Press", sets: [[100, 5], [100, 5], [97.5, 5], [92.5, 6]] },
        { exerciseId: "ex_005", exerciseName: "Overhead Press", sets: [[70, 5], [70, 5], [67.5, 6], [65, 8]] },
        { exerciseId: "ex_006", exerciseName: "Barbell Row", sets: [[90, 8], [90, 8], [90, 8]] },
        { exerciseId: "ex_007", exerciseName: "Dumbbell Curl", sets: [[22.5, 10], [22.5, 10], [20, 12]] },
      ],
    },
    {
      id: "workout_002",
      date: fmtDate(-3),
      name: "Leg Day",
      durationMinutes: 75,
      perceivedExertion: 9,
      sets: [
        { exerciseId: "ex_002", exerciseName: "Squat", sets: [[140, 5], [140, 5], [132.5, 5], [125, 8]] },
        { exerciseId: "ex_010", exerciseName: "Romanian Deadlift", sets: [[100, 10], [100, 10], [100, 10]] },
        { exerciseId: "ex_009", exerciseName: "Plank", sets: [[null, null, 60], [null, null, 60]] },
      ],
    },
    {
      id: "workout_003",
      date: fmtDate(-5),
      name: "Pull Day",
      durationMinutes: 55,
      perceivedExertion: 7,
      sets: [
        { exerciseId: "ex_003", exerciseName: "Deadlift", sets: [[180, 3], [180, 3], [170, 5]] },
        { exerciseId: "ex_004", exerciseName: "Pull-Up", sets: [[null, 8], [null, 7], [null, 6]] },
        { exerciseId: "ex_006", exerciseName: "Barbell Row", sets: [[85, 10], [85, 10], [80, 12]] },
      ],
    },
    {
      id: "workout_004",
      date: fmtDate(-7),
      name: "Morning Run",
      durationMinutes: 35,
      perceivedExertion: 6,
      sets: [
        { exerciseId: "ex_008", exerciseName: "Running", sets: [[null, null, null, 5.2]] },
      ],
    },
  ];

  const insertWorkout = db.prepare(`
    INSERT OR IGNORE INTO workouts (id, user_id, name, date, duration_minutes, total_volume, calories_burned, perceived_exertion, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSet = db.prepare(`
    INSERT OR IGNORE INTO workout_sets (id, workout_id, exercise_id, exercise_name, set_number, reps, weight, duration, distance, rest_seconds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const wd of workoutData) {
    let totalVolume = 0;
    let setNumber = 0;

    // Collect set data and compute volume BEFORE inserting anything (FK order: workout first)
    type SetRow = [string, string, string, string, number, number | null, number | null, number | null, number | null, number, null];
    const pendingSets: SetRow[] = [];
    for (const exData of wd.sets) {
      for (const setData of exData.sets) {
        setNumber++;
        const [weight, reps, duration, distance] = setData as [number | null, number | null, number | null, number | null];
        if (weight && reps) totalVolume += weight * reps;
        pendingSets.push([
          `set_${wd.id}_${setNumber}`,
          wd.id,
          exData.exerciseId,
          exData.exerciseName,
          setNumber,
          reps ?? null,
          weight ?? null,
          duration ?? null,
          distance ?? null,
          90,
          null,
        ]);
      }
    }

    // Insert workout FIRST (parent), then sets (children)
    const calories = Math.round(((wd.perceivedExertion / 10) * 8 + 3) * 75 * wd.durationMinutes / 60);
    insertWorkout.run(wd.id, userId, wd.name, wd.date, wd.durationMinutes, totalVolume, calories, wd.perceivedExertion, null, now - 86400000, now - 86400000);
    for (const setArgs of pendingSets) {
      insertSet.run(...setArgs);
    }
  }

  // ─── Bodyweight entries ───────────────────────────────────────────────────────
  const insertBW = db.prepare(`
    INSERT OR IGNORE INTO bodyweight_entries (id, user_id, date, weight, body_fat_percent, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const bwData = [
    { days: 0, weight: 82.4, bf: 14.2 },
    { days: 3, weight: 82.7, bf: 14.5 },
    { days: 7, weight: 83.1, bf: 14.8 },
    { days: 10, weight: 82.9, bf: 14.6 },
    { days: 14, weight: 83.4, bf: 15.0 },
    { days: 21, weight: 83.8, bf: 15.2 },
    { days: 28, weight: 84.2, bf: 15.5 },
  ];
  for (const bw of bwData) {
    insertBW.run(`bw_${userId}_${fmtDate(-bw.days)}`, userId, fmtDate(-bw.days), bw.weight, bw.bf, null, now - bw.days * 86400000);
  }

  // ─── Focus Sessions ───────────────────────────────────────────────────────────
  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO focus_sessions (id, user_id, title, type, status, planned_minutes, actual_minutes, started_at, ended_at, paused_at, total_paused_ms, skill_id, task_id, notes, xp_earned, focus_score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const sessionData: Array<Partial<FocusSession>> = [
    { id: "sess_001", title: "API Architecture Deep Work", type: "deep_work", status: "completed", plannedMinutes: 90, actualMinutes: 85, focusScore: 92, xpEarned: 180, skillId: "skill_002", taskId: "task_001" },
    { id: "sess_002", title: "Algorithm Study", type: "learning", status: "completed", plannedMinutes: 60, actualMinutes: 58, focusScore: 88, xpEarned: 120, skillId: "skill_002", taskId: null },
    { id: "sess_003", title: "Weekly Planning", type: "planning", status: "completed", plannedMinutes: 30, actualMinutes: 25, focusScore: 78, xpEarned: 60, skillId: "skill_005", taskId: null },
    { id: "sess_004", title: "Code Review Session", type: "review", status: "completed", plannedMinutes: 45, actualMinutes: 42, focusScore: 85, xpEarned: 90, skillId: "skill_002", taskId: null },
    { id: "sess_005", title: "Design System Work", type: "deep_work", status: "completed", plannedMinutes: 120, actualMinutes: 112, focusScore: 94, xpEarned: 240, skillId: "skill_002", taskId: "task_003" },
  ];

  for (let i = 0; i < sessionData.length; i++) {
    const s = sessionData[i];
    const startedAt = now - (i + 1) * 86400000 + 9 * 3600000; // morning sessions
    insertSession.run(
      s.id, userId, s.title, s.type, s.status,
      s.plannedMinutes, s.actualMinutes,
      startedAt,
      startedAt + (s.actualMinutes! * 60000),
      null, 0,
      s.skillId ?? null, s.taskId ?? null,
      null, s.xpEarned, s.focusScore,
      startedAt, startedAt + (s.actualMinutes! * 60000)
    );
  }

  // ─── XP Events ────────────────────────────────────────────────────────────────
  const insertXP = db.prepare(`
    INSERT OR IGNORE INTO xp_events (id, skill_id, user_id, amount, source, source_id, description, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const xpEvents = [
    { skillId: "skill_002", amount: 180, source: "session", sourceId: "sess_001", desc: "API Architecture Deep Work" },
    { skillId: "skill_002", amount: 120, source: "session", sourceId: "sess_002", desc: "Algorithm Study" },
    { skillId: "skill_001", amount: 75, source: "workout", sourceId: "workout_001", desc: "Upper Body Power" },
    { skillId: "skill_004", amount: 40, source: "task", sourceId: "task_002", desc: "Completed 5k run" },
    { skillId: "skill_003", amount: 10, source: "habit", sourceId: "habit_003", desc: "Cold shower streak" },
    { skillId: "skill_005", amount: 60, source: "session", sourceId: "sess_003", desc: "Weekly Planning" },
  ];
  for (let i = 0; i < xpEvents.length; i++) {
    const ev = xpEvents[i];
    const ts = now - (i + 1) * 86400000 + 10 * 3600000; // deterministic timestamps
    insertXP.run(`xp_${ev.skillId}_${ev.sourceId}`, ev.skillId, userId, ev.amount, ev.source, ev.sourceId, ev.desc, ts);
  }

  console.log("✅ Database seeded successfully");
}

function fmtDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
