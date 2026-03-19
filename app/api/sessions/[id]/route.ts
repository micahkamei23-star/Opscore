import { NextRequest, NextResponse } from "next/server";
import { sessionsRepository } from "@/infrastructure/repositories/sessionsRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { calculateFocusScore, calculateSessionXP, applyXPToSkill } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const ActionSchema = z.object({
  action: z.enum(["pause", "resume", "complete", "abandon"]),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionsRepository.getSessionById(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionsRepository.getSessionById(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await req.json();
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
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

      // Calculate actual minutes
      const elapsed = (now - session.startedAt - session.totalPausedMs) / 60000;
      updated.actualMinutes = Math.max(1, Math.round(elapsed));

      if (action === "complete") {
        const focusScore = calculateFocusScore(updated);
        updated.focusScore = focusScore;
        const xp = calculateSessionXP(updated);
        updated.xpEarned = xp;

        // Award XP to linked skill
        if (updated.skillId) {
          const skill = skillsRepository.getSkillById(updated.skillId);
          if (skill) {
            const newSkill = applyXPToSkill(skill, xp);
            skillsRepository.updateSkill(newSkill);
            skillsRepository.addXPEvent({
              id: uuidv4(),
              skillId: updated.skillId,
              userId: updated.userId,
              amount: xp,
              source: "session",
              sourceId: id,
              description: `Focus session: ${updated.title}`,
              timestamp: now,
            });
          }
        }
      }
      break;
    }
  }

  sessionsRepository.updateSession(updated);
  return NextResponse.json({ session: updated });
}
