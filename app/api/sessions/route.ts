import { NextRequest, NextResponse } from "next/server";
import { sessionsRepository } from "@/infrastructure/repositories/sessionsRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { calculateFocusScore, calculateSessionXP, applyXPToSkill } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { FocusSession } from "@/core/entities/types";

const SessionSchema = z.object({
  userId: z.string().default("user_seed_001"),
  title: z.string().min(1).max(200),
  type: z.enum(["deep_work", "learning", "planning", "review", "other"]).default("deep_work"),
  plannedMinutes: z.number().int().positive(),
  skillId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
  const sessions = sessionsRepository.getSessions(userId, limit);
  const active = sessionsRepository.getActiveSession(userId);
  return NextResponse.json({ sessions, activeSession: active });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const now = Date.now();

  // Check no active session exists
  const existing = sessionsRepository.getActiveSession(data.userId);
  if (existing) {
    return NextResponse.json({ error: "Active session already exists", session: existing }, { status: 409 });
  }

  const session: FocusSession = {
    id: uuidv4(),
    userId: data.userId,
    title: data.title,
    type: data.type,
    status: "active",
    plannedMinutes: data.plannedMinutes,
    actualMinutes: 0,
    startedAt: now,
    endedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    skillId: data.skillId ?? null,
    taskId: data.taskId ?? null,
    notes: data.notes ?? null,
    xpEarned: 0,
    focusScore: null,
    createdAt: now,
    updatedAt: now,
  };

  const created = sessionsRepository.createSession(session);
  return NextResponse.json({ session: created }, { status: 201 });
}
