import { getDb } from "@/infrastructure/db/connection";


import type { Task } from "@/core/entities/types";

import { initDatabase } from "@/infrastructure/db/init";

function ensureInit() {
  initDatabase();
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    category: row.category as Task["category"],
    dueDate: row.due_date as string | null,
    completedAt: row.completed_at as number | null,
    estimatedMinutes: row.estimated_minutes as number | null,
    actualMinutes: row.actual_minutes as number | null,
    tags: JSON.parse((row.tags as string) || "[]"),
    skillId: row.skill_id as string | null,
    xpReward: row.xp_reward as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export const tasksRepository = {
  getTasks(userId: string, status?: Task["status"]): Task[] {
    ensureInit();
    const db = getDb();
    const query = status
      ? "SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY created_at DESC"
      : "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC";
    const rows = (status
      ? db.prepare(query).all(userId, status)
      : db.prepare(query).all(userId)) as Record<string, unknown>[];
    return rows.map(rowToTask);
  },

  getTaskById(id: string): Task | null {
    ensureInit();
    const db = getDb();
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? rowToTask(row) : null;
  },

  createTask(task: Task): Task {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO tasks (id, user_id, title, description, status, priority, category, due_date, completed_at, estimated_minutes, actual_minutes, tags, skill_id, xp_reward, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.userId, task.title, task.description, task.status, task.priority, task.category, task.dueDate, task.completedAt, task.estimatedMinutes, task.actualMinutes, JSON.stringify(task.tags), task.skillId, task.xpReward, task.createdAt, task.updatedAt);
    return task;
  },

  updateTask(task: Task): Task {
    ensureInit();
    const db = getDb();
    db.prepare(`
      UPDATE tasks SET title=?, description=?, status=?, priority=?, category=?, due_date=?, completed_at=?, estimated_minutes=?, actual_minutes=?, tags=?, skill_id=?, xp_reward=?, updated_at=?
      WHERE id=?
    `).run(task.title, task.description, task.status, task.priority, task.category, task.dueDate, task.completedAt, task.estimatedMinutes, task.actualMinutes, JSON.stringify(task.tags), task.skillId, task.xpReward, task.updatedAt, task.id);
    return task;
  },

  deleteTask(id: string): void {
    ensureInit();
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  },

  getTaskStats(userId: string): { total: number; done: number; inProgress: number; overdue: number } {
    ensureInit();
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const row = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status != 'done' AND status != 'cancelled' AND due_date < ? THEN 1 ELSE 0 END) as overdue
      FROM tasks WHERE user_id = ?
    `).get(today, userId) as Record<string, number>;

    return {
      total: row.total,
      done: row.done,
      inProgress: row.in_progress,
      overdue: row.overdue,
    };
  },
};
