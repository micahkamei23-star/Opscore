import { NextRequest, NextResponse } from "next/server";
import { habitsRepository } from "@/infrastructure/repositories/habitsRepository";
import { skillsRepository } from "@/infrastructure/repositories/skillsRepository";
import { applyXPToSkill } from "@/core/rules/calculations";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: habitId } = await params;
  const habit = habitsRepository.getHabitById(habitId);
  if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const today = new Date().toISOString().split("T")[0];

  if (habitsRepository.isCompletedToday(habitId)) {
    return NextResponse.json({ error: "Already completed today" }, { status: 409 });
  }

  const now = Date.now();
  const completion = habitsRepository.createCompletion({
    id: uuidv4(),
    habitId,
    userId: habit.userId,
    date: today,
    completedAt: now,
    notes: body.notes ?? null,
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

  return NextResponse.json({ completion, habit: updatedHabit }, { status: 201 });
}
