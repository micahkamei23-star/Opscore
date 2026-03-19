import { NextRequest, NextResponse } from "next/server";
import { habitsRepository } from "@/infrastructure/repositories/habitsRepository";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { Habit } from "@/core/entities/types";

const HabitSchema = z.object({
  userId: z.string().min(1).default("user_seed_001"),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.enum(["work", "fitness", "learning", "personal", "health", "finance", "social", "other"]).default("other"),
  schedule: z.object({
    frequency: z.enum(["daily", "weekly", "custom"]),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    timesPerPeriod: z.number().int().positive().max(100).default(1),
  }),
  targetStreak: z.number().int().positive().max(3650).default(30),
  skillId: z.string().nullable().optional(),
  xpPerCompletion: z.number().int().positive().max(1000).default(10),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
  icon: z.string().max(10).default("🔥"),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
    const habits = habitsRepository.getHabits(userId);
    const today = new Date().toISOString().split("T")[0];

    const habitsWithStatus = habits.map((habit) => ({
      ...habit,
      completedToday: habitsRepository.isCompletedToday(habit.id),
    }));

    return NextResponse.json({ habits: habitsWithStatus, date: today });
  } catch (e) {
    logger.error("GET /api/habits failed", { error: String(e) });
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

  const parsed = HabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
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
    logger.info("Habit created", { habitId: created.id, userId: data.userId });
    return NextResponse.json({ habit: created }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/habits failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
