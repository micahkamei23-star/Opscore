"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useDashboardStore, useUIStore } from "@/presentation/store";
import { StatCard, Card, ProgressBar, Spinner, Badge } from "@/presentation/components/ui";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { TimePeriod } from "@/core/entities/types";
import { levelProgressPercent } from "@/core/rules/calculations";

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export default function DashboardPage() {
  const { stats, loading, fetchDashboard } = useDashboardStore();
  const { activePeriod, setActivePeriod } = useUIStore();

  useEffect(() => {
    fetchDashboard(activePeriod);
  }, [activePeriod]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const workoutData = (stats.chartData as any)?.workouts ?? [];
  const habitData = (stats.chartData as any)?.habits ?? [];
  const xpData = (stats.chartData as any)?.xp ?? [];

  return (
    <div className="space-y-8">
      {/* Period filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white/50 text-sm">Welcome back,</h2>
          <h1 className="text-2xl font-bold text-white">Alex Chen 👋</h1>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActivePeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activePeriod === opt.value
                  ? "bg-indigo-600 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          label="Total XP"
          value={stats.totalXP.toLocaleString()}
          sub="this period"
          icon="⚡"
          color="text-indigo-400"
        />
        <StatCard
          label="Focus Hours"
          value={`${stats.focusHours}h`}
          sub="deep work"
          icon="🧠"
          color="text-blue-400"
        />
        <StatCard
          label="Workouts"
          value={stats.workoutsCompleted}
          sub={`${Math.round(stats.fitnessVolume).toLocaleString()}kg volume`}
          icon="💪"
          color="text-amber-400"
        />
        <StatCard
          label="Active Streaks"
          value={stats.activeStreaks}
          sub={`${Math.round(stats.habitCompletionRate * 100)}% habits done`}
          icon="🔥"
          color="text-emerald-400"
        />
      </motion.div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* XP Chart */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-white font-semibold mb-4">XP Progression</h3>
          {xpData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={xpData}>
                <defs>
                  <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Area type="monotone" dataKey="xp" stroke="#6366f1" fill="url(#xpGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">No XP data yet</div>
          )}
        </Card>

        {/* Top Skills */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Top Skills</h3>
          <div className="space-y-4">
            {(stats.topSkills as any[]).length > 0 ? (
              (stats.topSkills as any[]).map(({ skill, xpGained }: any) => (
                <div key={skill.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{skill.icon}</span>
                      <span className="text-white/80 text-sm">{skill.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: skill.color }}>+{xpGained} XP</span>
                  </div>
                  <ProgressBar
                    value={levelProgressPercent(skill)}
                    hexColor={skill.color}
                    height="h-1.5"
                  />
                  <p className="text-white/30 text-xs mt-0.5">Level {skill.level}</p>
                </div>
              ))
            ) : (
              <p className="text-white/30 text-sm">No XP earned this period</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Workout Chart */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Training Volume</h3>
          {workoutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={workoutData}>
                <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }}
                />
                <Bar dataKey="volume" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">No workout data</div>
          )}
        </Card>

        {/* Habit Chart */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Habit Completions</h3>
          {habitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={habitData}>
                <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }}
                />
                <Bar dataKey="completions" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">No habit data</div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Active Tasks</h3>
            <a href="/tasks" className="text-indigo-400 text-sm hover:text-indigo-300">View all →</a>
          </div>
          <div className="space-y-3">
            {((stats.activeTasks as any[]) ?? []).length === 0 ? (
              <p className="text-white/30 text-sm">No active tasks</p>
            ) : (
              ((stats.activeTasks as any[]) ?? []).map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === "critical" ? "bg-red-500" :
                    task.priority === "high" ? "bg-orange-500" :
                    task.priority === "medium" ? "bg-yellow-500" : "bg-gray-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-white/30 text-xs">Due {task.dueDate}</p>
                    )}
                  </div>
                  <Badge variant={task.status === "in_progress" ? "info" : "default"}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Workouts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Workouts</h3>
            <a href="/fitness" className="text-indigo-400 text-sm hover:text-indigo-300">View all →</a>
          </div>
          <div className="space-y-3">
            {((stats.recentWorkouts as any[]) ?? []).length === 0 ? (
              <p className="text-white/30 text-sm">No workouts logged</p>
            ) : (
              ((stats.recentWorkouts as any[]) ?? []).map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xl">🏋️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium">{w.name}</p>
                    <p className="text-white/30 text-xs">{w.date} · {w.durationMinutes}min · {Math.round(w.totalVolume).toLocaleString()}kg</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
