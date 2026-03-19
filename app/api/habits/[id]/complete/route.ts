import { NextRequest, NextResponse } from "next/server";
import { habitsRepository } from "@/infrastructure/repositories/habitsRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { applyXPToSkill } from "@/core/rules/calculations";
import { withTransaction } from "@/infrastructure/db/connection";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";

const CompleteSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: habitId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = CompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const habit = habitsRepository.getHabitById(habitId);
    if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

    if (habit.isArchived) {
      return NextResponse.json({ error: "Cannot complete an archived habit" }, { status: 409 });
    }

    if (habitsRepository.isCompletedToday(habitId)) {
      return NextResponse.json({ error: "Already completed today" }, { status: 409 });
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const notes = parsed.data.notes ?? null;

    // Atomic: completion + streak recalculation + optional XP award
    const result = withTransaction(() => {
      const completion = habitsRepository.createCompletion({
        id: uuidv4(),
        habitId,
        userId: habit.userId,
        date: today,
        completedAt: now,
        notes,
        xpEarned: habit.xpPerCompletion,
      });

      const updatedHabit = habitsRepository.recalculateStreaks({
        ...habit,
        totalCompletions: habit.totalCompletions + 1,
      });

      if (habit.skillId) {
        const skill = skillsRepository.getSkillById(habit.skillId);
        if (skill) {
          const newSkill = applyXPToSkill(skill, habit.xpPerCompletion);
          skillsRepository.updateSkill(newSkill);
          skillsRepository.addXPEvent({
            id: uuidv4(),
            skillId: habit.skillId,
            userId: habit.userId,
            amount: habit.xpPerCompletion,
            source: "habit",
            sourceId: habitId,
            description: `Completed habit: ${habit.name}`,
            timestamp: now,
          });
        }
      }

      return { completion, habit: updatedHabit };
    });

    logger.info("Habit completed", {
      habitId,
      streak: result.habit.currentStreak,
      xp: habit.xpPerCompletion,
    });

    return NextResponse.json({ completion: result.completion, habit: result.habit }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/habits/[id]/complete failed", { habitId, error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
