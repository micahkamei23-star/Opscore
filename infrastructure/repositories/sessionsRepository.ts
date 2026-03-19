import { getDb } from "@/infrastructure/db/connection";


import type { FocusSession } from "@/core/entities/types";

import { initDatabase } from "@/infrastructure/db/init";

function ensureInit() {
  initDatabase();
}

function rowToSession(row: Record<string, unknown>): FocusSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    type: row.type as FocusSession["type"],
    status: row.status as FocusSession["status"],
    plannedMinutes: row.planned_minutes as number,
    actualMinutes: row.actual_minutes as number,
    startedAt: row.started_at as number,
    endedAt: row.ended_at as number | null,
    pausedAt: row.paused_at as number | null,
    totalPausedMs: row.total_paused_ms as number,
    skillId: row.skill_id as string | null,
    taskId: row.task_id as string | null,
    notes: row.notes as string | null,
    xpEarned: row.xp_earned as number,
    focusScore: row.focus_score as number | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export const sessionsRepository = {
  getSessions(userId: string, limit = 50): FocusSession[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?")
      .all(userId, limit) as Record<string, unknown>[];
    return rows.map(rowToSession);
  },

  getActiveSession(userId: string): FocusSession | null {
    ensureInit();
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM focus_sessions WHERE user_id = ? AND status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1")
      .get(userId) as Record<string, unknown> | undefined;
    return row ? rowToSession(row) : null;
  },

  getSessionById(id: string): FocusSession | null {
    ensureInit();
    const db = getDb();
    const row = db.prepare("SELECT * FROM focus_sessions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? rowToSession(row) : null;
  },

  createSession(session: FocusSession): FocusSession {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO focus_sessions (id, user_id, title, type, status, planned_minutes, actual_minutes, started_at, ended_at, paused_at, total_paused_ms, skill_id, task_id, notes, xp_earned, focus_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.id, session.userId, session.title, session.type, session.status, session.plannedMinutes, session.actualMinutes, session.startedAt, session.endedAt, session.pausedAt, session.totalPausedMs, session.skillId, session.taskId, session.notes, session.xpEarned, session.focusScore, session.createdAt, session.updatedAt);
    return session;
  },

  updateSession(session: FocusSession): FocusSession {
    ensureInit();
    const db = getDb();
    db.prepare(`
      UPDATE focus_sessions SET title=?, type=?, status=?, planned_minutes=?, actual_minutes=?, started_at=?, ended_at=?, paused_at=?, total_paused_ms=?, skill_id=?, task_id=?, notes=?, xp_earned=?, focus_score=?, updated_at=?
      WHERE id=?
    `).run(session.title, session.type, session.status, session.plannedMinutes, session.actualMinutes, session.startedAt, session.endedAt, session.pausedAt, session.totalPausedMs, session.skillId, session.taskId, session.notes, session.xpEarned, session.focusScore, session.updatedAt, session.id);
    return session;
  },

  getSessionStats(userId: string, days = 30): { totalSessions: number; totalFocusMinutes: number; avgFocusScore: number; avgSessionLength: number } {
    ensureInit();
    const db = getDb();
    const since = Date.now() - days * 86400000;
    const row = db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(actual_minutes), 0) as total_minutes,
        COALESCE(AVG(focus_score), 0) as avg_score,
        COALESCE(AVG(actual_minutes), 0) as avg_length
      FROM focus_sessions
      WHERE user_id = ? AND status = 'completed' AND started_at >= ?
    `).get(userId, since) as Record<string, number>;

    return {
      totalSessions: row.total_sessions,
      totalFocusMinutes: row.total_minutes,
      avgFocusScore: Math.round(row.avg_score),
      avgSessionLength: Math.round(row.avg_length),
    };
  },
};
