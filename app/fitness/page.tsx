"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFitnessStore, useUIStore } from "@/presentation/store";
import { Card, Button, StatCard, ProgressBar, EmptyState, Badge } from "@/presentation/components/ui";
import { Modal } from "@/presentation/components/ui/Modal";
import { Input, Select, Textarea } from "@/presentation/components/ui";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { Workout } from "@/core/entities/types";

export default function FitnessPage() {
  const { workouts, bodyweight, loading, fetchWorkouts, fetchBodyweight } = useFitnessStore();
  const { addNotification } = useUIStore();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showBWModal, setShowBWModal] = useState(false);

  useEffect(() => {
    fetchWorkouts();
    fetchBodyweight();
  }, []);

  const totalVolume = workouts.reduce((s, w) => s + w.totalVolume, 0);
  const avgDuration = workouts.length ? Math.round(workouts.reduce((s, w) => s + w.durationMinutes, 0) / workouts.length) : 0;

  const bwChartData = [...bodyweight].reverse().map((e) => ({ date: e.date, weight: e.weight }));

  return (
    <div className="space-y-8">
      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Workouts" value={workouts.length} icon="🏋️" color="text-amber-400" />
        <StatCard label="Total Volume" value={`${Math.round(totalVolume / 1000)}t`} sub={`${Math.round(totalVolume).toLocaleString()}kg`} icon="📊" color="text-orange-400" />
        <StatCard label="Avg Duration" value={`${avgDuration}m`} icon="⏱️" color="text-blue-400" />
        <StatCard label="Current Weight" value={bodyweight[0] ? `${bodyweight[0].weight}kg` : "—"} sub={bodyweight[0]?.bodyFatPercent ? `${bodyweight[0].bodyFatPercent}% BF` : undefined} icon="⚖️" color="text-purple-400" />
      </motion.div>

      <div className="flex gap-3">
        <Button onClick={() => setShowLogModal(true)} icon={<span>+</span>}>Log Workout</Button>
        <Button variant="secondary" onClick={() => setShowBWModal(true)} icon={<span>⚖️</span>}>Log Weight</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bodyweight chart */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Bodyweight Trend</h3>
          {bwChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={bwChartData}>
                <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#ffffff40", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Line type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="⚖️" title="No weight data" description="Log your bodyweight to track trends" />
          )}
        </Card>

        {/* Recent workouts */}
        <Card className="p-6">
          <h3 className="text-white font-semibold mb-4">Recent Sessions</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {workouts.length === 0 ? (
              <EmptyState icon="🏋️" title="No workouts yet" description="Start logging your training sessions" />
            ) : (
              workouts.slice(0, 5).map((w) => (
                <div key={w.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/15 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/90 font-medium text-sm">{w.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{w.date} · {w.durationMinutes}min</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 text-sm font-medium">{Math.round(w.totalVolume).toLocaleString()}kg</p>
                      {w.perceivedExertion && <p className="text-white/30 text-xs">RPE {w.perceivedExertion}</p>}
                    </div>
                  </div>
                  {w.sets.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[...new Set(w.sets.map((s) => s.exerciseName))].slice(0, 4).map((name) => (
                        <span key={name} className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Full workout list */}
      <Card className="p-6">
        <h3 className="text-white font-semibold mb-4">All Workouts</h3>
        {workouts.length === 0 ? (
          <EmptyState icon="💪" title="No workouts logged" description="Track your training to unlock analytics" action={<Button onClick={() => setShowLogModal(true)}>Log First Workout</Button>} />
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <WorkoutRow key={w.id} workout={w} />
            ))}
          </div>
        )}
      </Card>

      <LogWorkoutModal isOpen={showLogModal} onClose={() => setShowLogModal(false)} />
      <LogBodyweightModal isOpen={showBWModal} onClose={() => setShowBWModal(false)} />
    </div>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <span className="text-2xl">🏋️</span>
        <div className="flex-1">
          <p className="text-white/90 font-medium text-sm">{workout.name}</p>
          <p className="text-white/40 text-xs">{workout.date}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-amber-400">{Math.round(workout.totalVolume).toLocaleString()}kg</span>
          <span className="text-white/40">{workout.durationMinutes}min</span>
          {workout.perceivedExertion && <Badge variant="default">RPE {workout.perceivedExertion}</Badge>}
          <span className="text-white/30 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <div className="grid gap-2">
                {workout.sets.map((set) => (
                  <div key={set.id} className="flex items-center gap-3 text-sm text-white/60">
                    <span className="w-5 text-white/30 text-xs">{set.setNumber}</span>
                    <span className="flex-1 text-white/70">{set.exerciseName}</span>
                    {set.weight && <span className="text-amber-400/80">{set.weight}kg</span>}
                    {set.reps && <span>× {set.reps}</span>}
                    {set.duration && <span>{set.duration}s</span>}
                    {set.distance && <span>{set.distance}km</span>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LogWorkoutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { createWorkout } = useFitnessStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", date: new Date().toISOString().split("T")[0], durationMinutes: "45", perceivedExertion: "7", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createWorkout({
        name: form.name,
        date: form.date,
        durationMinutes: parseInt(form.durationMinutes),
        perceivedExertion: parseInt(form.perceivedExertion),
        notes: form.notes || null,
        sets: [],
      });
      addNotification({ type: "success", message: "Workout logged successfully!" });
      onClose();
    } catch {
      addNotification({ type: "error", message: "Failed to log workout" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Workout" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="workout-form" loading={loading}>Log Workout</Button>
      </>
    }>
      <form id="workout-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Workout Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upper Body Power" required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Input label="Duration (min)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required min="1" />
        </div>
        <Select label="Perceived Exertion (RPE)" value={form.perceivedExertion} onChange={(e) => setForm({ ...form, perceivedExertion: e.target.value })}
          options={[1,2,3,4,5,6,7,8,9,10].map((n) => ({ value: String(n), label: `${n} — ${["","Very Easy","Easy","Moderate","Somewhat Hard","Hard","","Very Hard","","","Max"][n] || ""}` }))} />
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={3} />
      </form>
    </Modal>
  );
}

function LogBodyweightModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { logBodyweight } = useFitnessStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ weight: "", bodyFatPercent: "", date: new Date().toISOString().split("T")[0] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logBodyweight({ weight: parseFloat(form.weight), bodyFatPercent: form.bodyFatPercent ? parseFloat(form.bodyFatPercent) : undefined, date: form.date });
      addNotification({ type: "success", message: "Weight logged!" });
      onClose();
    } catch {
      addNotification({ type: "error", message: "Failed to log weight" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Bodyweight" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="bw-form" loading={loading}>Log Weight</Button>
      </>
    }>
      <form id="bw-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <Input label="Weight (kg)" type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 82.5" required />
        <Input label="Body Fat % (optional)" type="number" step="0.1" value={form.bodyFatPercent} onChange={(e) => setForm({ ...form, bodyFatPercent: e.target.value })} placeholder="e.g. 14.5" />
      </form>
    </Modal>
  );
}
