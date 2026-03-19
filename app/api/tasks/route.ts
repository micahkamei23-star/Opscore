import { NextRequest, NextResponse } from "next/server";
import { tasksRepository } from "@/infrastructure/repositories/tasksRepository";
import { calculateTaskXP } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { Task } from "@/core/entities/types";

const VALID_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;

const TaskSchema = z.object({
  userId: z.string().min(1).default("user_seed_001"),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  category: z.enum(["work", "fitness", "learning", "personal", "health", "finance", "social", "other"]).default("other"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  estimatedMinutes: z.number().int().positive().max(10080).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  skillId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
    const rawStatus = req.nextUrl.searchParams.get("status");
    const status = rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as Task["status"])
      : undefined;

    const tasks = tasksRepository.getTasks(userId, status);
    return NextResponse.json({ tasks });
  } catch (e) {
    logger.error("GET /api/tasks failed", { error: String(e) });
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

  const parsed = TaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const now = Date.now();
    const task: Task = {
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      description: data.description ?? null,
      status: "todo",
      priority: data.priority,
      category: data.category,
      dueDate: data.dueDate ?? null,
      completedAt: null,
      estimatedMinutes: data.estimatedMinutes ?? null,
      actualMinutes: null,
      tags: data.tags,
      skillId: data.skillId ?? null,
      xpReward: calculateTaskXP({ priority: data.priority, estimatedMinutes: data.estimatedMinutes ?? null }),
      createdAt: now,
      updatedAt: now,
    };
    const created = tasksRepository.createTask(task);
    logger.info("Task created", { taskId: created.id, userId: data.userId });
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/tasks failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
