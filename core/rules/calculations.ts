// Core business rules - pure functions, no framework dependencies
import type {
  Skill,
  ProgressionModel,
  Habit,
  HabitCompletion,
  ISODate,
  WorkoutSet,
  FocusSession,
  Task,
} from "../entities/types";

// ─── XP & Level Calculations ──────────────────────────────────────────────────

const XP_BASE: Record<ProgressionModel, number> = {
  linear: 100,
  exponential: 80,
  fibonacci: 89,
};

/** Returns XP required to reach the NEXT level from current level */
export function xpForNextLevel(level: number, model: ProgressionModel): number {
  if (level <= 0) return XP_BASE[model];
  switch (model) {
    case "linear":
      return XP_BASE.linear * (level + 1);
    case "exponential":
      return Math.floor(XP_BASE.exponential * Math.pow(1.5, level));
    case "fibonacci": {
      // Fibonacci-weighted: grows moderately
      const fib = fibonacciAt(level + 3);
      return Math.floor(XP_BASE.fibonacci * fib);
    }
  }
}

function fibonacciAt(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const tmp = a + b;
    a = b;
    b = tmp;
  }
  return b;
}

/** Returns the total cumulative XP needed to reach a given level from level 0 */
export function cumulativeXPForLevel(level: number, model: ProgressionModel): number {
  let total = 0;
  for (let l = 0; l < level; l++) {
    total += xpForNextLevel(l, model);
  }
  return total;
}

/** Given a skill and new XP, returns updated skill state (level, currentXP, etc.) */
export function applyXPToSkill(skill: Skill, xpGained: number): Skill {
  let updatedXP = skill.currentXP + xpGained;
  let updatedLevel = skill.level;
  let updatedTotal = skill.totalXP + xpGained;
  let xpToNext = xpForNextLevel(updatedLevel, skill.progressionModel);

  // Handle multi-level ups
  while (updatedXP >= xpToNext) {
    updatedXP -= xpToNext;
    updatedLevel++;
    xpToNext = xpForNextLevel(updatedLevel, skill.progressionModel);
  }

  return {
    ...skill,
    level: updatedLevel,
    currentXP: updatedXP,
    totalXP: updatedTotal,
    xpToNextLevel: xpToNext,
    updatedAt: Date.now(),
  };
}

/** Compute percentage progress to next level */
export function levelProgressPercent(skill: Skill): number {
  const xpNeeded = xpForNextLevel(skill.level, skill.progressionModel);
  if (xpNeeded === 0) return 100;
  return Math.min(100, Math.round((skill.currentXP / xpNeeded) * 100));
}

// ─── Habit Streak Calculations ────────────────────────────────────────────────

/** Given sorted (asc) completion dates, computes current and longest streaks */
export function calculateStreaks(
  completionDates: ISODate[],
  habit: Pick<Habit, "schedule">
): { currentStreak: number; longestStreak: number } {
  if (completionDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const sorted = [...new Set(completionDates)].sort();
  const isDaily = habit.schedule.frequency === "daily";

  if (!isDaily) {
    // For non-daily habits, compute simple streak by consecutive periods
    return computeWeeklyStreak(sorted);
  }

  return computeDailyStreak(sorted);
}

function computeDailyStreak(
  sortedDates: ISODate[]
): { currentStreak: number; longestStreak: number } {
  let longestStreak = 1;
  let currentStreak = 1;

  const today = toDateStr(new Date());
  const yesterday = toDateStr(offsetDate(new Date(), -1));

  const lastDate = sortedDates[sortedDates.length - 1];
  const isActive = lastDate === today || lastDate === yesterday;

  if (!isActive) return { currentStreak: 0, longestStreak: computeLongestLinear(sortedDates, 1) };

  // Walk backwards from end
  for (let i = sortedDates.length - 1; i > 0; i--) {
    const diff = daysBetween(sortedDates[i - 1], sortedDates[i]);
    if (diff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      break;
    }
  }

  const longest = computeLongestLinear(sortedDates, 1);
  return { currentStreak, longestStreak: Math.max(longestStreak, longest) };
}

function computeWeeklyStreak(
  sortedDates: ISODate[]
): { currentStreak: number; longestStreak: number } {
  // Group by ISO week number
  const weeks = new Set(sortedDates.map((d) => isoWeek(d)));
  const sortedWeeks = [...weeks].sort((a, b) => a - b);

  let current = 1;
  let longest = 1;
  for (let i = sortedWeeks.length - 1; i > 0; i--) {
    if (sortedWeeks[i] - sortedWeeks[i - 1] === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      break;
    }
  }
  return { currentStreak: current, longestStreak: longest };
}

function computeLongestLinear(dates: ISODate[], gapDays: number): number {
  if (dates.length === 0) return 0;
  let longest = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === gapDays) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

// ─── Workout Volume ───────────────────────────────────────────────────────────

export function calculateWorkoutVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => {
    if (set.weight != null && set.reps != null) {
      return total + set.weight * set.reps;
    }
    return total;
  }, 0);
}

export function calculateEstimatedCalories(
  durationMinutes: number,
  perceivedExertion: number
): number {
  // MET-based approximation: higher RPE = higher MET
  const met = 3 + (perceivedExertion / 10) * 8; // 3-11 MET range
  const avgWeightKg = 75; // baseline body weight
  return Math.round((met * avgWeightKg * durationMinutes) / 60);
}

// ─── Session Focus Score ──────────────────────────────────────────────────────

export function calculateFocusScore(session: FocusSession): number {
  if (session.plannedMinutes === 0) return 0;
  const efficiency = Math.min(1, session.actualMinutes / session.plannedMinutes);
  const pausePenalty = 1 - Math.min(0.5, session.totalPausedMs / (session.actualMinutes * 60000));
  return Math.round(efficiency * pausePenalty * 100);
}

export function calculateSessionXP(session: FocusSession): number {
  const baseXP = Math.floor(session.actualMinutes / 5) * 10; // 10 XP per 5 minutes
  const focusBonus = session.focusScore ? Math.floor(session.focusScore / 20) * 5 : 0;
  return baseXP + focusBonus;
}

// ─── Task XP ──────────────────────────────────────────────────────────────────

export function calculateTaskXP(task: Pick<Task, "priority" | "estimatedMinutes">): number {
  const priorityMultiplier: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  const base = 20;
  const timeBonus = task.estimatedMinutes ? Math.floor(task.estimatedMinutes / 15) * 5 : 0;
  return base * (priorityMultiplier[task.priority] ?? 1) + timeBonus;
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function toDateStr(d: Date): ISODate {
  return d.toISOString().split("T")[0];
}

export function offsetDate(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function isoWeek(dateStr: ISODate): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 + ((week1.getDay() + 6) % 7) - 2) / 7
  );
}

export function isHabitDueToday(habit: Habit, today: Date = new Date()): boolean {
  const todayStr = toDateStr(today);
  const dayOfWeek = today.getDay();
  const { schedule } = habit;

  if (schedule.frequency === "daily") return true;
  if (schedule.frequency === "weekly") {
    return schedule.daysOfWeek.includes(dayOfWeek);
  }
  // custom: daysOfWeek defines which days
  return schedule.daysOfWeek.includes(dayOfWeek);
}

export function habitCompletionRateForPeriod(
  completions: HabitCompletion[],
  startDate: ISODate,
  endDate: ISODate,
  habit: Habit
): number {
  const days = daysBetween(startDate, endDate) + 1;
  const inRange = completions.filter(
    (c) => c.date >= startDate && c.date <= endDate
  );
  const expected = habit.schedule.frequency === "daily"
    ? days
    : Math.ceil(days / 7) * habit.schedule.timesPerPeriod;
  if (expected === 0) return 0;
  return Math.min(1, inRange.length / expected);
}
