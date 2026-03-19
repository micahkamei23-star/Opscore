import { NextRequest, NextResponse } from "next/server";
import { tasksRepository } from "@/infrastructure/repositories/tasksRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { applyXPToSkill } from "@/core/rules/calculations";
import { withTransaction } from "@/infrastructure/db/connection";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";

const UpdateSchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  category: z.enum(["work", "fitness", "learning", "personal", "health", "finance", "social", "other"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  estimatedMinutes: z.number().int().positive().max(10080).nullable().optional(),
  actualMinutes: z.number().int().positive().max(10080).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  skillId: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = tasksRepository.getTaskById(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (e) {
    logger.error("GET /api/tasks/[id] failed", { error: String(e) });
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

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const task = tasksRepository.getTaskById(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const data = parsed.data;
    const now = Date.now();
    const wasCompleted = task.status !== "done" && data.status === "done";

    // Prevent re-completion
    if (task.status === "done" && data.status === "done") {
      return NextResponse.json({ error: "Task is already completed" }, { status: 409 });
    }

    const updated = {
      ...task,
      ...data,
      // Preserve xpReward; never let the client override it
      xpReward: task.xpReward,
      completedAt: data.status === "done" ? now : task.completedAt,
      updatedAt: now,
    };

    // Atomic: update task + award XP in single transaction
    withTransaction(() => {
      tasksRepository.updateTask(updated);

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
    });

    if (wasCompleted) {
      logger.info("Task completed", { taskId: id, xpReward: updated.xpReward, skillId: updated.skillId });
    }

    return NextResponse.json({ task: updated });
  } catch (e) {
    logger.error("PATCH /api/tasks/[id] failed", { id, error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = tasksRepository.getTaskById(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    tasksRepository.deleteTask(id);
    logger.info("Task deleted", { taskId: id });
    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("DELETE /api/tasks/[id] failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
