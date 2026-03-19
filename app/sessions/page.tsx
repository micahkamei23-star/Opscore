"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionsStore, useUIStore } from "@/presentation/store";
import { Card, Button, StatCard, Badge, EmptyState, Input, Select } from "@/presentation/components/ui";
import { Modal } from "@/presentation/components/ui/Modal";
import type { FocusSession } from "@/core/entities/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SessionsPage() {
  const { sessions, activeSession, elapsedSeconds, loading, fetchSessions, pauseSession, resumeSession, completeSession, abandonSession, tickTimer } = useSessionsStore();
  const { addNotification } = useUIStore();
  const [showStart, setShowStart] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSession?.status === "active") {
      timerRef.current = setInterval(() => tickTimer(), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession?.status]);

  const handleComplete = async () => {
    try {
      await completeSession();
      addNotification({ type: "success", message: "Session completed! XP awarded." });
    } catch {
      addNotification({ type: "error", message: "Failed to complete session" });
    }
  };

  const handleAbandon = async () => {
    try {
      await abandonSession();
      addNotification({ type: "info", message: "Session abandoned" });
    } catch {}
  };

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalFocusMinutes = completedSessions.reduce((s, sess) => s + sess.actualMinutes, 0);
  const avgScore = completedSessions.length ? Math.round(completedSessions.reduce((s, sess) => s + (sess.focusScore ?? 0), 0) / completedSessions.length) : 0;

  const plannedProgress = activeSession ? Math.min(100, (elapsedSeconds / (activeSession.plannedMinutes * 60)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Sessions" value={completedSessions.length} icon="🧠" color="text-blue-400" />
        <StatCard label="Focus Time" value={`${Math.round(totalFocusMinutes / 60 * 10) / 10}h`} sub={`${totalFocusMinutes}min total`} icon="⏱️" color="text-indigo-400" />
        <StatCard label="Avg Focus Score" value={`${avgScore}%`} icon="🎯" color="text-purple-400" />
      </div>

      {/* Active Session or Start */}
      {activeSession ? (
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div>
              <p className="text-white/40 text-sm uppercase tracking-widest mb-1">Active Session</p>
              <h2 className="text-white text-2xl font-bold">{activeSession.title}</h2>
              <p className="text-white/40 text-sm mt-1 capitalize">{activeSession.type.replace("_", " ")}</p>
            </div>

            {/* Timer */}
            <motion.div
              animate={activeSession.status === "active" ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl font-black tracking-tighter text-white font-mono"
            >
              {formatTime(elapsedSeconds)}
            </motion.div>

            {/* Progress ring substitute */}
            <div className="w-full bg-white/10 rounded-full h-2 max-w-sm mx-auto">
              <motion.div
                className="h-2 bg-indigo-500 rounded-full"
                animate={{ width: `${plannedProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-white/30 text-xs">{Math.round(plannedProgress)}% of {activeSession.plannedMinutes}min goal</p>

            <div className="flex items-center justify-center gap-3">
              {activeSession.status === "active" ? (
                <Button variant="secondary" onClick={pauseSession} icon={<span>⏸</span>}>Pause</Button>
              ) : (
                <Button variant="secondary" onClick={resumeSession} icon={<span>▶</span>}>Resume</Button>
              )}
              <Button variant="success" onClick={handleComplete} icon={<span>✓</span>}>Complete</Button>
              <Button variant="danger" onClick={handleAbandon} icon={<span>✗</span>}>Abandon</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="text-center">
          <Button size="lg" onClick={() => setShowStart(true)} icon={<span>🧠</span>}>Start Focus Session</Button>
        </div>
      )}

      {/* Session history */}
      <Card className="p-6">
        <h3 className="text-white font-semibold mb-4">Session History</h3>
        {sessions.length === 0 ? (
          <EmptyState icon="⏱️" title="No sessions yet" description="Start a focus session to build your deep work habit" />
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </Card>

      <StartSessionModal isOpen={showStart} onClose={() => setShowStart(false)} />
    </div>
  );
}

function SessionRow({ session }: { session: FocusSession }) {
  const typeIcons: Record<string, string> = { deep_work: "🧠", learning: "📚", planning: "📋", review: "🔍", other: "⏱️" };
  const statusColors: Record<string, string> = { completed: "text-emerald-400", abandoned: "text-red-400", active: "text-blue-400", paused: "text-yellow-400" };

  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
      <span className="text-xl">{typeIcons[session.type] ?? "⏱️"}</span>
      <div className="flex-1">
        <p className="text-white/80 text-sm font-medium">{session.title}</p>
        <p className="text-white/30 text-xs">
          {new Date(session.startedAt).toLocaleDateString()} · {session.actualMinutes}min
        </p>
      </div>
      <div className="flex items-center gap-3">
        {session.focusScore != null && (
          <div className="text-right">
            <p className="text-xs text-white/60">Score</p>
            <p className={`text-sm font-bold ${session.focusScore >= 80 ? "text-emerald-400" : session.focusScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>{session.focusScore}%</p>
          </div>
        )}
        {session.xpEarned > 0 && <span className="text-indigo-400 text-xs">+{session.xpEarned} XP</span>}
        <span className={`text-xs font-medium ${statusColors[session.status]}`}>{session.status}</span>
      </div>
    </div>
  );
}

function StartSessionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { startSession } = useSessionsStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "deep_work", plannedMinutes: "25",
  });

  const presets = [
    { label: "Pomodoro", minutes: 25 },
    { label: "Short", minutes: 45 },
    { label: "Deep Work", minutes: 90 },
    { label: "Marathon", minutes: 180 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await startSession({
        title: form.title,
        type: form.type as FocusSession["type"],
        plannedMinutes: parseInt(form.plannedMinutes),
      });
      addNotification({ type: "success", message: "Session started! Stay focused." });
      onClose();
    } catch (err: any) {
      addNotification({ type: "error", message: err?.message ?? "Failed to start session" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Focus Session" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="session-form" loading={loading}>Start Session</Button>
      </>
    }>
      <form id="session-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Session Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What are you working on?" required />
        <Select label="Session Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={[
            { value: "deep_work", label: "🧠 Deep Work" },
            { value: "learning", label: "📚 Learning" },
            { value: "planning", label: "📋 Planning" },
            { value: "review", label: "🔍 Review" },
            { value: "other", label: "⏱️ Other" },
          ]} />
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Duration</label>
          <div className="flex gap-2 mb-3">
            {presets.map((p) => (
              <button
                key={p.minutes}
                type="button"
                onClick={() => setForm({ ...form, plannedMinutes: String(p.minutes) })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${parseInt(form.plannedMinutes) === p.minutes ? "bg-indigo-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input type="number" value={form.plannedMinutes} onChange={(e) => setForm({ ...form, plannedMinutes: e.target.value })} placeholder="Minutes" min="1" required />
        </div>
      </form>
    </Modal>
  );
}
