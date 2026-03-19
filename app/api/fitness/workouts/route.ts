import { NextRequest, NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";
import { calculateWorkoutVolume, calculateEstimatedCalories } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Workout, WorkoutSet } from "@/core/entities/types";

const SetSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().nullable(),
  weight: z.number().nonnegative().nullable(),
  duration: z.number().nonnegative().nullable(),
  distance: z.number().nonnegative().nullable(),
  restSeconds: z.number().nonnegative().nullable(),
  notes: z.string().nullable().optional(),
});

const WorkoutSchema = z.object({
  userId: z.string().default("user_seed_001"),
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().positive(),
  perceivedExertion: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  sets: z.array(SetSchema),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
  const workouts = fitnessRepository.getWorkouts(userId, limit);
  return NextResponse.json({ workouts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = WorkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const now = Date.now();

  const sets: WorkoutSet[] = data.sets.map((s) => ({
    id: uuidv4(),
    workoutId: "",
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

  const totalVolume = calculateWorkoutVolume(sets as WorkoutSet[]);
  const calories = calculateEstimatedCalories(
    data.durationMinutes,
    data.perceivedExertion ?? 7
  );

  const workoutId = uuidv4();
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
    sets: sets.map((s) => ({ ...s, workoutId })),
    createdAt: now,
    updatedAt: now,
  };

  const created = fitnessRepository.createWorkout(workout);
  return NextResponse.json({ workout: created }, { status: 201 });
}
