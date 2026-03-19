import { NextRequest, NextResponse } from "next/server";
import { sessionsRepository } from "@/infrastructure/repositories/sessionsRepository";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { FocusSession } from "@/core/entities/types";

const SessionSchema = z.object({
  userId: z.string().min(1).default("user_seed_001"),
  title: z.string().min(1).max(200),
  type: z.enum(["deep_work", "learning", "planning", "review", "other"]).default("deep_work"),
  plannedMinutes: z.number().int().positive().max(480),
  skillId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
    const rawLimit = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(1, parseInt(rawLimit ?? "50") || 50), 200);

    const sessions = sessionsRepository.getSessions(userId, limit);
    const active = sessionsRepository.getActiveSession(userId);
    return NextResponse.json({ sessions, activeSession: active });
  } catch (e) {
    logger.error("GET /api/sessions failed", { error: String(e) });
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

  const parsed = SessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const now = Date.now();

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
    logger.info("Session started", { sessionId: created.id, userId: data.userId, plannedMinutes: data.plannedMinutes });
    return NextResponse.json({ session: created }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/sessions failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
