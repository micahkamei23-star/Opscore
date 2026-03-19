import { getDb } from "@/infrastructure/db/connection";


import type { Skill, XPEvent } from "@/core/entities/types";

import { initDatabase } from "@/infrastructure/db/init";

function ensureInit() {
  initDatabase();
}

function rowToSkill(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    category: row.category as Skill["category"],
    level: row.level as number,
    currentXP: row.current_xp as number,
    totalXP: row.total_xp as number,
    xpToNextLevel: row.xp_to_next_level as number,
    progressionModel: row.progression_model as Skill["progressionModel"],
    color: row.color as string,
    icon: row.icon as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export const skillsRepository = {
  getSkills(userId: string): Skill[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM skills WHERE user_id = ? ORDER BY total_xp DESC")
      .all(userId) as Record<string, unknown>[];
    return rows.map(rowToSkill);
  },

  getSkillById(id: string): Skill | null {
    ensureInit();
    const db = getDb();
    const row = db.prepare("SELECT * FROM skills WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? rowToSkill(row) : null;
  },

  createSkill(skill: Skill): Skill {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO skills (id, user_id, name, description, category, level, current_xp, total_xp, xp_to_next_level, progression_model, color, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(skill.id, skill.userId, skill.name, skill.description, skill.category, skill.level, skill.currentXP, skill.totalXP, skill.xpToNextLevel, skill.progressionModel, skill.color, skill.icon, skill.createdAt, skill.updatedAt);
    return skill;
  },

  updateSkill(skill: Skill): Skill {
    ensureInit();
    const db = getDb();
    db.prepare(`
      UPDATE skills SET name=?, description=?, category=?, level=?, current_xp=?, total_xp=?, xp_to_next_level=?, progression_model=?, color=?, icon=?, updated_at=?
      WHERE id=?
    `).run(skill.name, skill.description, skill.category, skill.level, skill.currentXP, skill.totalXP, skill.xpToNextLevel, skill.progressionModel, skill.color, skill.icon, skill.updatedAt, skill.id);
    return skill;
  },

  deleteSkill(id: string): void {
    ensureInit();
    const db = getDb();
    db.prepare("DELETE FROM skills WHERE id = ?").run(id);
  },

  addXPEvent(event: XPEvent): XPEvent {
    ensureInit();
    const db = getDb();
    db.prepare(`
      INSERT INTO xp_events (id, skill_id, user_id, amount, source, source_id, description, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(event.id, event.skillId, event.userId, event.amount, event.source, event.sourceId, event.description, event.timestamp);
    return event;
  },

  getXPEvents(skillId: string, limit = 50): XPEvent[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM xp_events WHERE skill_id = ? ORDER BY timestamp DESC LIMIT ?")
      .all(skillId, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      skillId: r.skill_id as string,
      userId: r.user_id as string,
      amount: r.amount as number,
      source: r.source as XPEvent["source"],
      sourceId: r.source_id as string | null,
      description: r.description as string,
      timestamp: r.timestamp as number,
    }));
  },

  getXPEventsForUser(userId: string, since: number): XPEvent[] {
    ensureInit();
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM xp_events WHERE user_id = ? AND timestamp >= ? ORDER BY timestamp DESC")
      .all(userId, since) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      skillId: r.skill_id as string,
      userId: r.user_id as string,
      amount: r.amount as number,
      source: r.source as XPEvent["source"],
      sourceId: r.source_id as string | null,
      description: r.description as string,
      timestamp: r.timestamp as number,
    }));
  },
};
