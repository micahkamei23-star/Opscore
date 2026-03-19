"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useDashboardStore, useSkillsStore, useSessionsStore, useFitnessStore } from "@/presentation/store";
import { Card, StatCard, ProgressBar, Spinner } from "@/presentation/components/ui";
import { levelProgressPercent } from "@/core/rules/calculations";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function ProfilePage() {
  const { stats, loading: dashLoading, fetchDashboard } = useDashboardStore();
  const { skills, fetchSkills } = useSkillsStore();
  const { sessions, fetchSessions } = useSessionsStore();
  const { workouts, bodyweight, fetchWorkouts, fetchBodyweight } = useFitnessStore();

  useEffect(() => {
    fetchDashboard("month");
    fetchSkills();
    fetchSessions();
    fetchWorkouts();
    fetchBodyweight();
  }, []);

  if (dashLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  const totalXPAllTime = skills.reduce((s, sk) => s + sk.totalXP, 0);
  const totalFocusHours = Math.round(sessions.filter((s) => s.status === "completed").reduce((s, sess) => s + sess.actualMinutes, 0) / 60 * 10) / 10;
  const avgFocusScore = sessions.filter((s) => s.status === "completed" && s.focusScore != null).length > 0
    ? Math.round(sessions.filter((s) => s.status === "completed" && s.focusScore != null).reduce((s, sess) => s + (sess.focusScore ?? 0), 0) / sessions.filter((s) => s.status === "completed" && s.focusScore != null).length)
    : 0;

  const bwTrend = [...bodyweight].reverse().slice(-14).map((e) => ({ date: e.date, weight: e.weight }));

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card className="p-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-black">AC</div>
          <div>
            <h2 className="text-white text-2xl font-bold">Alex Chen</h2>
            <p className="text-white/40">alex@opscore.io</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-indigo-400 text-sm font-medium">⚡ {totalXPAllTime.toLocaleString()} XP</span>
              <span className="text-white/20">·</span>
              <span className="text-white/50 text-sm">{skills.length} skills tracked</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total XP" value={totalXPAllTime.toLocaleString()} icon="⚡" color="text-indigo-400" />
        <StatCard label="Focus Hours" value={`${totalFocusHours}h`} icon="🧠" color="text-blue-400" />
        <StatCard label="Workouts" value={workouts.length} icon="💪" color="text-amber-400" />
        <StatCard label="Avg Focus Score" value={`${avgFocusScore}%`} icon="🎯" color="text-purple-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skill Overview */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Skill Levels</h3>
          <div className="space-y-4">
            {skills.slice(0, 6).map((skill) => (
              <div key={skill.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{skill.icon}</span>
                    <span className="text-white/70 text-sm">{skill.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">{skill.totalXP.toLocaleString()} XP</span>
                    <span className="font-bold text-sm" style={{ color: skill.color }}>Lv.{skill.level}</span>
                  </div>
                </div>
                <ProgressBar value={levelProgressPercent(skill)} color="bg-indigo-500" height="h-1.5" />
              </div>
            ))}
          </div>
        </Card>

        {/* Bodyweight Chart */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Bodyweight (14 days)</h3>
          {bwTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={bwTrend}>
                <defs>
                  <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Area type="monotone" dataKey="weight" stroke="#a855f7" fill="url(#bwGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">Log weight to see trends</div>
          )}
        </Card>
      </div>

      {/* Recent sessions */}
      <Card className="p-6">
        <h3 className="text-white font-semibold mb-4">Recent Focus Sessions</h3>
        <div className="space-y-2">
          {sessions.slice(0, 8).map((sess) => (
            <div key={sess.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
              <div className="flex-1">
                <p className="text-white/80 text-sm">{sess.title}</p>
                <p className="text-white/30 text-xs">{new Date(sess.startedAt).toLocaleDateString()} · {sess.actualMinutes}min · {sess.type.replace("_", " ")}</p>
              </div>
              {sess.focusScore != null && (
                <span className={`text-sm font-bold ${sess.focusScore >= 80 ? "text-emerald-400" : sess.focusScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                  {sess.focusScore}%
                </span>
              )}
              {sess.xpEarned > 0 && <span className="text-indigo-400 text-xs">+{sess.xpEarned} XP</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
