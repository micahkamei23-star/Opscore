import { NextRequest, NextResponse } from "next/server";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { applyXPToSkill } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const XPSchema = z.object({
  amount: z.number().int().positive(),
  source: z.enum(["task", "habit", "workout", "session", "manual"]),
  sourceId: z.string().nullable().optional(),
  description: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: skillId } = await params;
  const skill = skillsRepository.getSkillById(skillId);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const body = await req.json();
  const parsed = XPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const updatedSkill = applyXPToSkill(skill, data.amount);
  skillsRepository.updateSkill(updatedSkill);
  skillsRepository.addXPEvent({
    id: uuidv4(),
    skillId,
    userId: skill.userId,
    amount: data.amount,
    source: data.source,
    sourceId: data.sourceId ?? null,
    description: data.description,
    timestamp: Date.now(),
  });

  return NextResponse.json({ skill: updatedSkill });
}
