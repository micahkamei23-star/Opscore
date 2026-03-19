"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabitsStore, useUIStore } from "@/presentation/store";
import { Card, Button, Badge, StatCard, ProgressBar, EmptyState, Input, Select } from "@/presentation/components/ui";
import { Modal } from "@/presentation/components/ui/Modal";
import type { Habit } from "@/core/entities/types";

export default function HabitsPage() {
  const { habits, loading, fetchHabits, completeHabit } = useHabitsStore();
  const { addNotification } = useUIStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchHabits(); }, []);

  const handleComplete = async (id: string) => {
    try {
      await completeHabit(id);
      addNotification({ type: "success", message: "Habit completed! 🔥 Streak updated!" });
    } catch (e: any) {
      const msg = e?.message ?? "Failed";
      addNotification({ type: e?.message?.includes("Already") ? "info" : "error", message: msg });
    }
  };

  const totalStreaks = habits.reduce((s, h) => s + h.currentStreak, 0);
  const completedToday = habits.filter((h) => h.completedToday).length;
  const longestStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Completed Today" value={`${completedToday}/${habits.length}`} icon="✅" color="text-emerald-400" />
        <StatCard label="Total Streaks" value={totalStreaks} sub="days combined" icon="🔥" color="text-orange-400" />
        <StatCard label="Longest Streak" value={longestStreak} sub="days" icon="🏆" color="text-amber-400" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} icon={<span>+</span>}>New Habit</Button>
      </div>

      {habits.length === 0 ? (
        <EmptyState icon="🔥" title="No habits yet" description="Build your daily system by adding habits" action={<Button onClick={() => setShowCreate(true)}>Create First Habit</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onComplete={handleComplete} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateHabitModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function HabitCard({ habit, onComplete }: { habit: Habit & { completedToday: boolean }; onComplete: (id: string) => void }) {
  const streakPct = Math.min(100, (habit.currentStreak / habit.targetStreak) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{habit.icon}</span>
          <div>
            <p className="text-white/90 font-semibold text-sm">{habit.name}</p>
            <p className="text-white/40 text-xs capitalize">{habit.category}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: habit.color }}>{habit.currentStreak}</p>
          <p className="text-white/30 text-xs">streak</p>
        </div>
      </div>

      {/* Streak progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Goal: {habit.targetStreak} days</span>
          <span>{habit.totalCompletions} total</span>
        </div>
        <ProgressBar value={streakPct} color="bg-emerald-500" />
      </div>

      {/* Complete button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => !habit.completedToday && onComplete(habit.id)}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
          habit.completedToday
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
            : "bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer"
        }`}
      >
        {habit.completedToday ? "✓ Completed Today" : "Mark Complete"}
      </motion.button>

      {/* Longest streak */}
      {habit.longestStreak > habit.currentStreak && (
        <p className="text-white/20 text-xs text-center mt-2">Best: {habit.longestStreak} days</p>
      )}
    </motion.div>
  );
}

function CreateHabitModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { createHabit } = useHabitsStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "other", frequency: "daily",
    targetStreak: "30", xpPerCompletion: "10",
    color: "#10b981", icon: "🔥",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createHabit({
        name: form.name,
        category: form.category as Habit["category"],
        schedule: { frequency: form.frequency as Habit["schedule"]["frequency"], daysOfWeek: [0,1,2,3,4,5,6], timesPerPeriod: 1 },
        targetStreak: parseInt(form.targetStreak),
        xpPerCompletion: parseInt(form.xpPerCompletion),
        color: form.color,
        icon: form.icon,
      });
      addNotification({ type: "success", message: "Habit created!" });
      setForm({ name: "", category: "other", frequency: "daily", targetStreak: "30", xpPerCompletion: "10", color: "#10b981", icon: "🔥" });
      onClose();
    } catch {
      addNotification({ type: "error", message: "Failed to create habit" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Habit" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="habit-form" loading={loading}>Create Habit</Button>
      </>
    }>
      <form id="habit-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Habit Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Workout" required />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={["work","fitness","learning","personal","health","finance","social","other"].map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target Streak (days)" type="number" value={form.targetStreak} onChange={(e) => setForm({ ...form, targetStreak: e.target.value })} min="1" required />
          <Input label="XP per Completion" type="number" value={form.xpPerCompletion} onChange={(e) => setForm({ ...form, xpPerCompletion: e.target.value })} min="1" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Icon (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🔥" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-white/70">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 bg-white/5 border border-white/10 rounded-lg cursor-pointer" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
