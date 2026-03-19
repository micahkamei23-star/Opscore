import { NextRequest, NextResponse } from "next/server";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { applyXPToSkill } from "@/core/rules/calculations";
import { withTransaction } from "@/infrastructure/db/connection";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";

const XPSchema = z.object({
  amount: z.number().int().positive().max(10000),
  source: z.enum(["task", "habit", "workout", "session", "manual"]),
  sourceId: z.string().nullable().optional(),
  description: z.string().min(1).max(300),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: skillId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = XPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const skill = skillsRepository.getSkillById(skillId);
    if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

    const data = parsed.data;
    const now = Date.now();

    // Atomic: update skill XP + record event
    const updatedSkill = withTransaction(() => {
      const newSkill = applyXPToSkill(skill, data.amount);
      skillsRepository.updateSkill(newSkill);
      skillsRepository.addXPEvent({
        id: uuidv4(),
        skillId,
        userId: skill.userId,
        amount: data.amount,
        source: data.source,
        sourceId: data.sourceId ?? null,
        description: data.description,
        timestamp: now,
      });
      return newSkill;
    });

    logger.info("XP awarded", {
      skillId,
      amount: data.amount,
      source: data.source,
      newLevel: updatedSkill.level,
    });

    return NextResponse.json({ skill: updatedSkill });
  } catch (e) {
    logger.error("POST /api/skills/[id]/xp failed", { skillId, error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
