"use client";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type {
  Task,
  Habit,
  Workout,
  Skill,
  FocusSession,
  BodyweightEntry,
  DashboardStats,
  TimePeriod,
} from "@/core/entities/types";

// ─── UI State (non-persistent) ───────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean;
  activePeriod: TimePeriod;
  activeModal: string | null;
  notifications: Notification[];
  setSidebarOpen: (open: boolean) => void;
  setActivePeriod: (period: TimePeriod) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    sidebarOpen: true,
    activePeriod: "week",
    activeModal: null,
    notifications: [],
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setActivePeriod: (period) => set({ activePeriod: period }),
    openModal: (id) => set({ activeModal: id }),
    closeModal: () => set({ activeModal: null }),
    addNotification: (notification) =>
      set((state) => ({
        notifications: [
          ...state.notifications,
          { ...notification, id: crypto.randomUUID() },
        ],
      })),
    removeNotification: (id) =>
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
  }))
);

// ─── Tasks Store ──────────────────────────────────────────────────────────────

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<Task>;
}

export const useTasksStore = create<TasksState>()(
  subscribeWithSelector((set, get) => ({
    tasks: [],
    loading: false,
    error: null,

    fetchTasks: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/tasks");
        const data = await res.json();
        set({ tasks: data.tasks, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },

    createTask: async (taskData) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const { task } = await res.json();
      set((state) => ({ tasks: [task, ...state.tasks] }));
      return task;
    },

    updateTask: async (id, data) => {
      // Optimistic update
      const prev = get().tasks;
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t
        ),
      }));

      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update task");
        const { task } = await res.json();
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        }));
        return task;
      } catch (e) {
        set({ tasks: prev }); // rollback
        throw e;
      }
    },

    deleteTask: async (id) => {
      const prev = get().tasks;
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete task");
      } catch (e) {
        set({ tasks: prev });
        throw e;
      }
    },

    completeTask: async (id) => {
      return get().updateTask(id, { status: "done" });
    },
  }))
);

// ─── Habits Store ─────────────────────────────────────────────────────────────

interface HabitsState {
  habits: Array<Habit & { completedToday: boolean }>;
  loading: boolean;
  error: string | null;
  fetchHabits: () => Promise<void>;
  createHabit: (data: Partial<Habit>) => Promise<Habit>;
  completeHabit: (id: string, notes?: string) => Promise<void>;
}

export const useHabitsStore = create<HabitsState>()(
  subscribeWithSelector((set, get) => ({
    habits: [],
    loading: false,
    error: null,

    fetchHabits: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/habits");
        const data = await res.json();
        set({ habits: data.habits, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },

    createHabit: async (habitData) => {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(habitData),
      });
      if (!res.ok) throw new Error("Failed to create habit");
      const { habit } = await res.json();
      set((state) => ({
        habits: [...state.habits, { ...habit, completedToday: false }],
      }));
      return habit;
    },

    completeHabit: async (id, notes) => {
      // Optimistic
      set((state) => ({
        habits: state.habits.map((h) =>
          h.id === id
            ? { ...h, completedToday: true, currentStreak: h.currentStreak + 1, totalCompletions: h.totalCompletions + 1 }
            : h
        ),
      }));

      try {
        const res = await fetch(`/api/habits/${id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        if (!res.ok) {
          get().fetchHabits(); // re-sync on failure
          throw new Error("Failed to complete habit");
        }
        const { habit } = await res.json();
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id ? { ...habit, completedToday: true } : h
          ),
        }));
      } catch (e) {
        get().fetchHabits();
        throw e;
      }
    },
  }))
);

// ─── Fitness Store ────────────────────────────────────────────────────────────

interface FitnessState {
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  loading: boolean;
  error: string | null;
  fetchWorkouts: () => Promise<void>;
  fetchBodyweight: () => Promise<void>;
  createWorkout: (data: Partial<Workout>) => Promise<Workout>;
  logBodyweight: (data: { weight: number; bodyFatPercent?: number; date?: string }) => Promise<void>;
}

export const useFitnessStore = create<FitnessState>()(
  subscribeWithSelector((set) => ({
    workouts: [],
    bodyweight: [],
    loading: false,
    error: null,

    fetchWorkouts: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/fitness/workouts");
        const data = await res.json();
        set({ workouts: data.workouts, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },

    fetchBodyweight: async () => {
      try {
        const res = await fetch("/api/fitness/bodyweight");
        const data = await res.json();
        set({ bodyweight: data.entries });
      } catch (e) {
        set({ error: String(e) });
      }
    },

    createWorkout: async (workoutData) => {
      const res = await fetch("/api/fitness/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutData),
      });
      if (!res.ok) throw new Error("Failed to create workout");
      const { workout } = await res.json();
      set((state) => ({ workouts: [workout, ...state.workouts] }));
      return workout;
    },

    logBodyweight: async ({ weight, bodyFatPercent, date }) => {
      const res = await fetch("/api/fitness/bodyweight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight,
          bodyFatPercent: bodyFatPercent ?? null,
          date: date ?? new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Failed to log bodyweight");
      const { entry } = await res.json();
      set((state) => ({ bodyweight: [entry, ...state.bodyweight] }));
    },
  }))
);

// ─── Skills Store ─────────────────────────────────────────────────────────────

interface SkillsState {
  skills: Skill[];
  loading: boolean;
  error: string | null;
  fetchSkills: () => Promise<void>;
  createSkill: (data: Partial<Skill>) => Promise<Skill>;
  addXP: (skillId: string, amount: number, description: string) => Promise<Skill>;
}

export const useSkillsStore = create<SkillsState>()(
  subscribeWithSelector((set) => ({
    skills: [],
    loading: false,
    error: null,

    fetchSkills: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/skills");
        const data = await res.json();
        set({ skills: data.skills, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },

    createSkill: async (skillData) => {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skillData),
      });
      if (!res.ok) throw new Error("Failed to create skill");
      const { skill } = await res.json();
      set((state) => ({ skills: [...state.skills, skill] }));
      return skill;
    },

    addXP: async (skillId, amount, description) => {
      const res = await fetch(`/api/skills/${skillId}/xp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, source: "manual", description }),
      });
      if (!res.ok) throw new Error("Failed to add XP");
      const { skill } = await res.json();
      set((state) => ({
        skills: state.skills.map((s) => (s.id === skillId ? skill : s)),
      }));
      return skill;
    },
  }))
);

// ─── Sessions Store ───────────────────────────────────────────────────────────

interface SessionsState {
  sessions: FocusSession[];
  activeSession: FocusSession | null;
  elapsedSeconds: number;
  loading: boolean;
  fetchSessions: () => Promise<void>;
  startSession: (data: Partial<FocusSession>) => Promise<FocusSession>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: (notes?: string) => Promise<void>;
  abandonSession: () => Promise<void>;
  tickTimer: () => void;
}

export const useSessionsStore = create<SessionsState>()(
  subscribeWithSelector((set, get) => ({
    sessions: [],
    activeSession: null,
    elapsedSeconds: 0,
    loading: false,

    fetchSessions: async () => {
      set({ loading: true });
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        set({
          sessions: data.sessions,
          activeSession: data.activeSession,
          loading: false,
          elapsedSeconds: data.activeSession
            ? Math.floor((Date.now() - data.activeSession.startedAt - data.activeSession.totalPausedMs) / 1000)
            : 0,
        });
      } catch (e) {
        set({ loading: false });
      }
    },

    startSession: async (data) => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to start session");
      const { session } = await res.json();
      set({ activeSession: session, elapsedSeconds: 0 });
      return session;
    },

    pauseSession: async () => {
      const { activeSession } = get();
      if (!activeSession) return;
      const res = await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      if (!res.ok) throw new Error("Failed to pause session");
      const { session } = await res.json();
      set({ activeSession: session });
    },

    resumeSession: async () => {
      const { activeSession } = get();
      if (!activeSession) return;
      const res = await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
      if (!res.ok) throw new Error("Failed to resume session");
      const { session } = await res.json();
      set({ activeSession: session });
    },

    completeSession: async (notes) => {
      const { activeSession } = get();
      if (!activeSession) return;
      const res = await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", notes }),
      });
      if (!res.ok) throw new Error("Failed to complete session");
      const { session } = await res.json();
      set((state) => ({
        activeSession: null,
        elapsedSeconds: 0,
        sessions: [session, ...state.sessions],
      }));
    },

    abandonSession: async () => {
      const { activeSession } = get();
      if (!activeSession) return;
      await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abandon" }),
      });
      set({ activeSession: null, elapsedSeconds: 0 });
    },

    tickTimer: () => {
      const { activeSession } = get();
      if (activeSession?.status === "active") {
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
      }
    },
  }))
);

// ─── Dashboard Store ──────────────────────────────────────────────────────────

interface DashboardState {
  stats: (DashboardStats & Record<string, unknown>) | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: (period?: TimePeriod) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector((set) => ({
    stats: null,
    loading: false,
    error: null,

    fetchDashboard: async (period = "week") => {
      set({ loading: true, error: null });
      try {
        const res = await fetch(`/api/dashboard?period=${period}`);
        const data = await res.json();
        set({ stats: data, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },
  }))
);
