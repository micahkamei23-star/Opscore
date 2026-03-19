import { getDb } from "./connection";
import { logger } from "@/lib/logger";

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Exercises (catalog)
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_groups TEXT NOT NULL, -- JSON array
      equipment_required INTEGER NOT NULL DEFAULT 0,
      is_compound INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    -- Workouts
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      total_volume REAL NOT NULL DEFAULT 0,
      calories_burned INTEGER,
      perceived_exertion INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Workout sets
    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      duration INTEGER,
      distance REAL,
      rest_seconds INTEGER,
      notes TEXT
    );

    -- Bodyweight tracking
    CREATE TABLE IF NOT EXISTS bodyweight_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      weight REAL NOT NULL,
      body_fat_percent REAL,
      notes TEXT,
      created_at INTEGER NOT NULL
    );

    -- Skills
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      current_xp INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 0,
      xp_to_next_level INTEGER NOT NULL DEFAULT 100,
      progression_model TEXT NOT NULL DEFAULT 'linear',
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT '⚡',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- XP Events
    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT,
      description TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'other',
      due_date TEXT,
      completed_at INTEGER,
      estimated_minutes INTEGER,
      actual_minutes INTEGER,
      tags TEXT NOT NULL DEFAULT '[]', -- JSON array
      skill_id TEXT REFERENCES skills(id),
      xp_reward INTEGER NOT NULL DEFAULT 20,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Habits
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      schedule TEXT NOT NULL, -- JSON object
      target_streak INTEGER NOT NULL DEFAULT 30,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      total_completions INTEGER NOT NULL DEFAULT 0,
      skill_id TEXT REFERENCES skills(id),
      xp_per_completion INTEGER NOT NULL DEFAULT 10,
      color TEXT NOT NULL DEFAULT '#10b981',
      icon TEXT NOT NULL DEFAULT '🔥',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Habit completions
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      notes TEXT,
      xp_earned INTEGER NOT NULL DEFAULT 0
    );

    -- Focus Sessions
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'deep_work',
      status TEXT NOT NULL DEFAULT 'active',
      planned_minutes INTEGER NOT NULL,
      actual_minutes INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      paused_at INTEGER,
      total_paused_ms INTEGER NOT NULL DEFAULT 0,
      skill_id TEXT REFERENCES skills(id),
      task_id TEXT REFERENCES tasks(id),
      notes TEXT,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      focus_score INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, date);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_xp_events_skill ON xp_events(skill_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_bodyweight_user_date ON bodyweight_entries(user_id, date);
  `);

  logger.info("Database migrations applied");
}
