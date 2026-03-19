import { NextRequest, NextResponse } from "next/server";
import { sessionsRepository } from "@/infrastructure/repositories/sessionsRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { calculateFocusScore, calculateSessionXP, applyXPToSkill } from "@/core/rules/calculations";
import { withTransaction } from "@/infrastructure/db/connection";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";

const ActionSchema = z.object({
  action: z.enum(["pause", "resume", "complete", "abandon"]),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = sessionsRepository.getSessionById(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ session });
  } catch (e) {
    logger.error("GET /api/sessions/[id] failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const session = sessionsRepository.getSessionById(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Reject actions on already-ended sessions
    if (session.status === "completed" || session.status === "abandoned") {
      return NextResponse.json({ error: "Session has already ended" }, { status: 409 });
    }

    const { action, notes } = parsed.data;
    const now = Date.now();
    let updated = { ...session, updatedAt: now };

    switch (action) {
      case "pause":
        if (session.status !== "active") {
          return NextResponse.json({ error: "Can only pause active sessions" }, { status: 400 });
        }
        updated.status = "paused";
        updated.pausedAt = now;
        break;

      case "resume":
        if (session.status !== "paused") {
          return NextResponse.json({ error: "Can only resume paused sessions" }, { status: 400 });
        }
        updated.status = "active";
        updated.totalPausedMs = session.totalPausedMs + (now - (session.pausedAt ?? now));
        updated.pausedAt = null;
        break;

      case "complete":
      case "abandon": {
        updated.status = action === "complete" ? "completed" : "abandoned";
        updated.endedAt = now;
        updated.notes = notes ?? session.notes;

        const elapsed = (now - session.startedAt - session.totalPausedMs) / 60000;
        updated.actualMinutes = Math.max(1, Math.round(elapsed));

        if (action === "complete") {
          updated.focusScore = calculateFocusScore(updated);
          updated.xpEarned = calculateSessionXP(updated);

          // Atomic: update session + award XP
          withTransaction(() => {
            sessionsRepository.updateSession(updated);

            if (updated.skillId) {
              const skill = skillsRepository.getSkillById(updated.skillId);
              if (skill) {
                const newSkill = applyXPToSkill(skill, updated.xpEarned);
                skillsRepository.updateSkill(newSkill);
                skillsRepository.addXPEvent({
                  id: uuidv4(),
                  skillId: updated.skillId,
                  userId: updated.userId,
                  amount: updated.xpEarned,
                  source: "session",
                  sourceId: id,
                  description: `Focus session: ${updated.title}`,
                  timestamp: now,
                });
              }
            }
          });

          logger.info("Session completed", {
            sessionId: id,
            actualMinutes: updated.actualMinutes,
            focusScore: updated.focusScore,
            xpEarned: updated.xpEarned,
          });
          return NextResponse.json({ session: updated });
        }
        break;
      }
    }

    sessionsRepository.updateSession(updated);
    logger.info("Session action", { sessionId: id, action });
    return NextResponse.json({ session: updated });
  } catch (e) {
    logger.error("PATCH /api/sessions/[id] failed", { id, error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
