import { getDb } from "@/infrastructure/db/connection";


import type {
  Workout,
  WorkoutSet,
  Exercise,
  BodyweightEntry,
} from "@/core/entities/types";
import { DatabaseError } from "@/core/entities/errors";

import { initDatabase } from "@/infrastructure/db/init";

function ensureInit() {
  initDatabase();
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToWorkout(row: Record<string, unknown>): Workout {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    date: row.date as string,
    durationMinutes: row.duration_minutes as number,
    totalVolume: row.total_volume as number,
    caloriesBurned: row.calories_burned as number | null,
    perceivedExertion: row.perceived_exertion as number | null,
    notes: row.notes as string | null,
    sets: [],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function rowToSet(row: Record<string, unknown>): WorkoutSet {
  return {
    id: row.id as string,
    workoutId: row.workout_id as string,
    exerciseId: row.exercise_id as string,
    exerciseName: row.exercise_name as string,
    setNumber: row.set_number as number,
    reps: row.reps as number | null,
    weight: row.weight as number | null,
    duration: row.duration as number | null,
    distance: row.distance as number | null,
    restSeconds: row.rest_seconds as number | null,
    notes: row.notes as string | null,
  };
}

function rowToExercise(row: Record<string, unknown>): Exercise {
  return {
    id: row.id as string,
    name: row.name as string,
    muscleGroups: JSON.parse(row.muscle_groups as string),
    equipmentRequired: Boolean(row.equipment_required),
    isCompound: Boolean(row.is_compound),
    notes: row.notes as string | null,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const fitnessRepository = {
  getWorkouts(userId: string, limit = 50): Workout[] {
    ensureInit();
    const db = getDb();
    try {
      const rows = db
        .prepare("SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC LIMIT ?")
        .all(userId, limit) as Record<string, unknown>[];

      const workouts = rows.map(rowToWorkout);

      // Attach sets
      for (const workout of workouts) {
        const sets = db
          .prepare("SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_number ASC")
          .all(workout.id) as Record<string, unknown>[];
        workout.sets = sets.map(rowToSet);
      }

      return workouts;
    } catch (e) {
      throw new DatabaseError("Failed to get workouts", { cause: String(e) });
    }
  },

  getWorkoutById(id: string): Workout | null {
    ensureInit();
    const db = getDb();
    const row = db.prepare("SELECT * FROM workouts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    const workout = rowToWorkout(row);
    const sets = db.prepare("SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_number ASC").all(id) as Record<string, unknown>[];
    workout.sets = sets.map(rowToSet);
    return workout;
  },

  createWorkout(workout: Workout): Workout {
    ensureInit();
    const db = getDb();
    // Atomic: insert workout header + all sets together
    db.transaction(() => {
      db.prepare(`
        INSERT INTO workouts (id, user_id, name, date, duration_minutes, total_volume, calories_burned, perceived_exertion, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(workout.id, workout.userId, workout.name, workout.date, workout.durationMinutes, workout.totalVolume, workout.caloriesBurned, workout.perceivedExertion, workout.notes, workout.createdAt, workout.updatedAt);

      const insertSet = db.prepare(`
        INSERT INTO workout_sets (id, workout_id, exercise_id, exercise_name, set_number, reps, weight, duration, distance, rest_seconds, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of workout.sets) {
        insertSet.run(s.id, s.workoutId, s.exerciseId, s.exerciseName, s.setNumber, s.reps, s.weight, s.duration, s.distance, s.restSeconds, s.notes);
      }
    })();
    return workout;
  },

  updateWorkout(workout: Workout): Workout {
    ensureInit();
    const db = getDb();
    db.prepare(`
      UPDATE workouts SET name=?, date=?, duration_minutes=?, total_volume=?, calories_burned=?, perceived_exertion=?, notes=?, updated_at=? WHERE id=?
    `).run(workout.name, workout.date, workout.durationMinutes, workout.totalVolume, workout.caloriesBurned, workout.perceivedExertion, workout.notes, workout.updatedAt, workout.id);
    return workout;
  },

  deleteWorkout(id: string): void {
    ensureInit();
    const db = getDb();
    db.prepare("DELETE FROM workouts WHERE id = ?").run(id);
  },

  getBodyweightEntries(userId: string, limit = 90): BodyweightEntry[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM bodyweight_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?")
      .all(userId, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      date: r.date as string,
      weight: r.weight as number,
      bodyFatPercent: r.body_fat_percent as number | null,
      notes: r.notes as string | null,
      createdAt: r.created_at as number,
    }));
  },

  createBodyweightEntry(entry: BodyweightEntry): BodyweightEntry {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO bodyweight_entries (id, user_id, date, weight, body_fat_percent, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.userId, entry.date, entry.weight, entry.bodyFatPercent, entry.notes, entry.createdAt);
    return entry;
  },

  getExercises(): Exercise[] {
    ensureInit();
    const db = getDb();
    const rows = db.prepare("SELECT * FROM exercises ORDER BY name ASC").all() as Record<string, unknown>[];
    return rows.map(rowToExercise);
  },

  getWorkoutChartData(userId: string, sinceStr: string): Array<{ date: string; volume: number; duration: number }> {
    ensureInit();
    const db = getDb();
    return db.prepare(`
      SELECT date, SUM(total_volume) as volume, SUM(duration_minutes) as duration
      FROM workouts
      WHERE user_id = ? AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(userId, sinceStr) as Array<{ date: string; volume: number; duration: number }>;
  },

  getHabitChartData(userId: string, sinceStr: string): Array<{ date: string; completions: number }> {
    ensureInit();
    const db = getDb();
    return db.prepare(`
      SELECT date, COUNT(*) as completions
      FROM habit_completions
      WHERE user_id = ? AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(userId, sinceStr) as Array<{ date: string; completions: number }>;
  },

  getWorkoutStats(userId: string, days = 30): { totalWorkouts: number; totalVolume: number; avgDuration: number; totalCalories: number } {
    ensureInit();
    const db = getDb();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];
    const row = db.prepare(`
      SELECT
        COUNT(*) as total_workouts,
        COALESCE(SUM(total_volume), 0) as total_volume,
        COALESCE(AVG(duration_minutes), 0) as avg_duration,
        COALESCE(SUM(calories_burned), 0) as total_calories
      FROM workouts
      WHERE user_id = ? AND date >= ?
    `).get(userId, sinceStr) as Record<string, number>;

    return {
      totalWorkouts: row.total_workouts,
      totalVolume: row.total_volume,
      avgDuration: row.avg_duration,
      totalCalories: row.total_calories,
    };
  },
};
