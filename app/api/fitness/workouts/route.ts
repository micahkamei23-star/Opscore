import { NextRequest, NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";
import { calculateWorkoutVolume, calculateEstimatedCalories } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { Workout, WorkoutSet } from "@/core/entities/types";

const SetSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1).max(200),
  setNumber: z.number().int().positive().max(100),
  reps: z.number().int().positive().max(10000).nullable(),
  weight: z.number().nonnegative().max(10000).nullable(),
  duration: z.number().nonnegative().max(86400).nullable(),
  distance: z.number().nonnegative().max(1000000).nullable(),
  restSeconds: z.number().int().nonnegative().max(3600).nullable(),
  notes: z.string().max(500).nullable().optional(),
});

const WorkoutSchema = z.object({
  userId: z.string().min(1).default("user_seed_001"),
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().positive().max(1440),
  perceivedExertion: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  sets: z.array(SetSchema).min(1).max(200),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
    const rawLimit = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(1, parseInt(rawLimit ?? "50") || 50), 200);

    const workouts = fitnessRepository.getWorkouts(userId, limit);
    return NextResponse.json({ workouts });
  } catch (e) {
    logger.error("GET /api/fitness/workouts failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = WorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const now = Date.now();
    const workoutId = uuidv4();

    const sets: WorkoutSet[] = data.sets.map((s) => ({
      id: uuidv4(),
      workoutId,
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      setNumber: s.setNumber,
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      duration: s.duration ?? null,
      distance: s.distance ?? null,
      restSeconds: s.restSeconds ?? null,
      notes: s.notes ?? null,
    }));

    const totalVolume = calculateWorkoutVolume(sets);
    const calories = calculateEstimatedCalories(data.durationMinutes, data.perceivedExertion ?? 7);

    const workout: Workout = {
      id: workoutId,
      userId: data.userId,
      name: data.name,
      date: data.date,
      durationMinutes: data.durationMinutes,
      totalVolume,
      caloriesBurned: calories,
      perceivedExertion: data.perceivedExertion ?? null,
      notes: data.notes ?? null,
      sets,
      createdAt: now,
      updatedAt: now,
    };

    const created = fitnessRepository.createWorkout(workout);
    logger.info("Workout created", { workoutId: created.id, userId: data.userId, sets: sets.length });
    return NextResponse.json({ workout: created }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/fitness/workouts failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
