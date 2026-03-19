import { NextRequest, NextResponse } from "next/server";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { xpForNextLevel } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Skill } from "@/core/entities/types";

const SkillSchema = z.object({
  userId: z.string().default("user_seed_001"),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.enum(["technical", "physical", "mental", "creative", "social", "leadership", "other"]).default("other"),
  progressionModel: z.enum(["linear", "exponential", "fibonacci"]).default("linear"),
  color: z.string().default("#6366f1"),
  icon: z.string().default("⚡"),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const skills = skillsRepository.getSkills(userId);
  return NextResponse.json({ skills });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SkillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const now = Date.now();
  const skill: Skill = {
    id: uuidv4(),
    userId: data.userId,
    name: data.name,
    description: data.description ?? null,
    category: data.category,
    level: 1,
    currentXP: 0,
    totalXP: 0,
    xpToNextLevel: xpForNextLevel(1, data.progressionModel),
    progressionModel: data.progressionModel,
    color: data.color,
    icon: data.icon,
    createdAt: now,
    updatedAt: now,
  };
  const created = skillsRepository.createSkill(skill);
  return NextResponse.json({ skill: created }, { status: 201 });
}
