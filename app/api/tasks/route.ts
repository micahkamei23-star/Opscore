import { NextRequest, NextResponse } from "next/server";
import { tasksRepository } from "@/infrastructure/repositories/tasksRepository";
import { calculateTaskXP } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Task } from "@/core/entities/types";

const TaskSchema = z.object({
  userId: z.string().default("user_seed_001"),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  category: z.enum(["work", "fitness", "learning", "personal", "health", "finance", "social", "other"]).default("other"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string()).default([]),
  skillId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const status = req.nextUrl.searchParams.get("status") as Task["status"] | null;
  const tasks = tasksRepository.getTasks(userId, status ?? undefined);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
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
  return NextResponse.json({ task: created }, { status: 201 });
}
