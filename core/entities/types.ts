// Core domain types - no framework dependencies

export type ID = string;
export type Timestamp = number; // Unix milliseconds
export type ISODate = string; // YYYY-MM-DD

// ─── User ───────────────────────────────────────────────────────────────────

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Fitness ─────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "core"
  | "cardio"
  | "full_body";

export type WeightUnit = "kg" | "lbs";
export type DistanceUnit = "km" | "miles";

export interface ExerciseSet {
  setNumber: number;
  reps: number | null;
  weight: number | null; // in kg
  duration: number | null; // seconds
  distance: number | null; // km
  restSeconds: number | null;
  notes: string | null;
}

export interface Exercise {
  id: ID;
  name: string;
  muscleGroups: MuscleGroup[];
  equipmentRequired: boolean;
  isCompound: boolean;
  notes: string | null;
}

export interface WorkoutSet extends ExerciseSet {
  id: ID;
  workoutId: ID;
  exerciseId: ID;
  exerciseName: string;
}

export interface Workout {
  id: ID;
  userId: ID;
  name: string;
  date: ISODate;
  durationMinutes: number;
  totalVolume: number; // kg
  caloriesBurned: number | null;
  perceivedExertion: number | null; // 1-10 RPE scale
  notes: string | null;
  sets: WorkoutSet[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BodyweightEntry {
  id: ID;
  userId: ID;
  date: ISODate;
  weight: number; // kg
  bodyFatPercent: number | null;
  notes: string | null;
  createdAt: Timestamp;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskCategory =
  | "work"
  | "fitness"
  | "learning"
  | "personal"
  | "health"
  | "finance"
  | "social"
  | "other";

export interface Task {
  id: ID;
  userId: ID;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: ISODate | null;
  completedAt: Timestamp | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  tags: string[];
  skillId: ID | null; // links to skill progression
  xpReward: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export type HabitFrequency = "daily" | "weekly" | "custom";
export type HabitCategory = TaskCategory;

export interface HabitSchedule {
  frequency: HabitFrequency;
  daysOfWeek: number[]; // 0=Sun, 6=Sat — used for weekly/custom
  timesPerPeriod: number; // e.g. 3 times per week
}

export interface Habit {
  id: ID;
  userId: ID;
  name: string;
  description: string | null;
  category: HabitCategory;
  schedule: HabitSchedule;
  targetStreak: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  skillId: ID | null;
  xpPerCompletion: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HabitCompletion {
  id: ID;
  habitId: ID;
  userId: ID;
  date: ISODate;
  completedAt: Timestamp;
  notes: string | null;
  xpEarned: number;
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export type ProgressionModel = "linear" | "exponential" | "fibonacci";
export type SkillCategory =
  | "technical"
  | "physical"
  | "mental"
  | "creative"
  | "social"
  | "leadership"
  | "other";

export interface Skill {
  id: ID;
  userId: ID;
  name: string;
  description: string | null;
  category: SkillCategory;
  level: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
  progressionModel: ProgressionModel;
  color: string;
  icon: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface XPEvent {
  id: ID;
  skillId: ID;
  userId: ID;
  amount: number;
  source: "task" | "habit" | "workout" | "session" | "manual";
  sourceId: ID | null;
  description: string;
  timestamp: Timestamp;
}

// ─── Sessions / Focus ─────────────────────────────────────────────────────────

export type SessionType = "deep_work" | "learning" | "planning" | "review" | "other";
export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface FocusSession {
  id: ID;
  userId: ID;
  title: string;
  type: SessionType;
  status: SessionStatus;
  plannedMinutes: number;
  actualMinutes: number;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  pausedAt: Timestamp | null;
  totalPausedMs: number;
  skillId: ID | null;
  taskId: ID | null;
  notes: string | null;
  xpEarned: number;
  focusScore: number | null; // 1-100
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type TimePeriod = "day" | "week" | "month" | "year";

export interface DashboardStats {
  period: TimePeriod;
  date: ISODate;
  totalXP: number;
  taskCompletionRate: number;
  habitCompletionRate: number;
  workoutsCompleted: number;
  focusHours: number;
  activeStreaks: number;
  topSkills: Array<{ skill: Skill; xpGained: number }>;
  fitnessVolume: number;
  averageSessionLength: number;
}
