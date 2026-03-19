import { NextRequest, NextResponse } from "next/server";
import { tasksRepository } from "@/infrastructure/repositories/tasksRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { applyXPToSkill } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  category: z.enum(["work", "fitness", "learning", "personal", "health", "finance", "social", "other"]).optional(),
  dueDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  actualMinutes: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string()).optional(),
  skillId: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = tasksRepository.getTaskById(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = tasksRepository.getTaskById(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const now = Date.now();
  const wasCompleted = task.status !== "done" && data.status === "done";

  const updated = {
    ...task,
    ...data,
    completedAt: data.status === "done" ? now : task.completedAt,
    updatedAt: now,
  };

  tasksRepository.updateTask(updated);

  // Award XP if completing and linked to a skill
  if (wasCompleted && updated.skillId) {
    const skill = skillsRepository.getSkillById(updated.skillId);
    if (skill) {
      const newSkill = applyXPToSkill(skill, updated.xpReward);
      skillsRepository.updateSkill(newSkill);
      skillsRepository.addXPEvent({
        id: uuidv4(),
        skillId: updated.skillId,
        userId: updated.userId,
        amount: updated.xpReward,
        source: "task",
        sourceId: updated.id,
        description: `Completed task: ${updated.title}`,
        timestamp: now,
      });
    }
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  tasksRepository.deleteTask(id);
  return NextResponse.json({ success: true });
}
