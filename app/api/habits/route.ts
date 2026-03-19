import { NextRequest, NextResponse } from "next/server";
import { habitsRepository } from "@/infrastructure/repositories/habitsRepository";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Habit } from "@/core/entities/types";

const HabitSchema = z.object({
  userId: z.string().default("user_seed_001"),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.enum(["work", "fitness", "learning", "personal", "health", "finance", "social", "other"]).default("other"),
  schedule: z.object({
    frequency: z.enum(["daily", "weekly", "custom"]),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    timesPerPeriod: z.number().int().positive().default(1),
  }),
  targetStreak: z.number().int().positive().default(30),
  skillId: z.string().nullable().optional(),
  xpPerCompletion: z.number().int().positive().default(10),
  color: z.string().default("#10b981"),
  icon: z.string().default("🔥"),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const habits = habitsRepository.getHabits(userId);
  const today = new Date().toISOString().split("T")[0];

  const habitsWithStatus = habits.map((habit) => ({
    ...habit,
    completedToday: habitsRepository.isCompletedToday(habit.id),
  }));

  return NextResponse.json({ habits: habitsWithStatus, date: today });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = HabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const now = Date.now();
  const habit: Habit = {
    id: uuidv4(),
    userId: data.userId,
    name: data.name,
    description: data.description ?? null,
    category: data.category,
    schedule: data.schedule,
    targetStreak: data.targetStreak,
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    skillId: data.skillId ?? null,
    xpPerCompletion: data.xpPerCompletion,
    color: data.color,
    icon: data.icon,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  const created = habitsRepository.createHabit(habit);
  return NextResponse.json({ habit: created }, { status: 201 });
}
