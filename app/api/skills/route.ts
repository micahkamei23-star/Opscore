import { NextRequest, NextResponse } from "next/server";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { xpForNextLevel } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { Skill } from "@/core/entities/types";

const SkillSchema = z.object({
  userId: z.string().min(1).default("user_seed_001"),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.enum(["technical", "physical", "mental", "creative", "social", "leadership", "other"]).default("other"),
  progressionModel: z.enum(["linear", "exponential", "fibonacci"]).default("linear"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  icon: z.string().max(10).default("⚡"),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
    const skills = skillsRepository.getSkills(userId);
    return NextResponse.json({ skills });
  } catch (e) {
    logger.error("GET /api/skills failed", { error: String(e) });
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

  const parsed = SkillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
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
    logger.info("Skill created", { skillId: created.id, userId: data.userId });
    return NextResponse.json({ skill: created }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/skills failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
