"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasksStore, useUIStore } from "@/presentation/store";
import { Card, Button, Badge, EmptyState, Input, Select, Textarea } from "@/presentation/components/ui";
import { Modal } from "@/presentation/components/ui/Modal";
import type { Task } from "@/core/entities/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-gray-400",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "info" | "warning"> = {
  todo: "default",
  in_progress: "info",
  done: "success",
  cancelled: "warning",
};

type FilterStatus = "all" | "todo" | "in_progress" | "done";

export default function TasksPage() {
  const { tasks, loading, fetchTasks, completeTask, deleteTask } = useTasksStore();
  const { addNotification } = useUIStore();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchTasks(); }, []);

  const filtered = tasks.filter((t) => filter === "all" ? true : t.status === filter);
  const stats = {
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const handleComplete = async (id: string) => {
    try {
      await completeTask(id);
      addNotification({ type: "success", message: "Task completed! XP awarded." });
    } catch {
      addNotification({ type: "error", message: "Failed to complete task" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      addNotification({ type: "info", message: "Task deleted" });
    } catch {
      addNotification({ type: "error", message: "Failed to delete task" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "To Do", value: stats.todo, color: "text-white/60" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-400" },
          { label: "Done", value: stats.done, color: "text-emerald-400" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          {(["all", "todo", "in_progress", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"}`}
            >
              {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<span>+</span>}>New Task</Button>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState icon="✅" title="No tasks here" description="Create your first task to get started" action={<Button onClick={() => setShowCreate(true)}>Create Task</Button>} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <TaskCard task={task} onComplete={handleComplete} onDelete={handleDelete} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateTaskModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function TaskCard({ task, onComplete, onDelete }: { task: Task; onComplete: (id: string) => void; onDelete: (id: string) => void }) {
  const { updateTask, addNotification } = { ...useTasksStore(), ...useUIStore() };
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white/5 border border-white/5 rounded-xl transition-all hover:border-white/10 ${task.status === "done" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 p-4">
        {/* Complete button */}
        {task.status !== "done" && task.status !== "cancelled" ? (
          <button
            onClick={() => onComplete(task.id)}
            className="w-5 h-5 rounded-full border-2 border-white/30 hover:border-emerald-400 hover:bg-emerald-400/20 transition-all flex-shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 text-xs">✓</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-white/40" : "text-white/90"}`}>{task.title}</p>
            <Badge variant={STATUS_VARIANTS[task.status] ?? "default"}>{task.status.replace("_", " ")}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {task.dueDate && <span className="text-white/30 text-xs">📅 {task.dueDate}</span>}
            {task.estimatedMinutes && <span className="text-white/30 text-xs">⏱ {task.estimatedMinutes}m</span>}
            <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            {task.tags.length > 0 && task.tags.map((tag) => (
              <span key={tag} className="text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-indigo-400 text-xs font-medium">+{task.xpReward} XP</span>
          <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white text-xs p-1">
            {expanded ? "▲" : "▼"}
          </button>
          <button onClick={() => onDelete(task.id)} className="text-white/20 hover:text-red-400 text-xs p-1 transition-colors">✕</button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && task.description && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="px-4 pb-4 text-white/50 text-sm border-t border-white/5 pt-3">{task.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateTaskModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { createTask } = useTasksStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium", category: "other",
    dueDate: "", estimatedMinutes: "", tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTask({
        title: form.title,
        description: form.description || null,
        priority: form.priority as Task["priority"],
        category: form.category as Task["category"],
        dueDate: form.dueDate || null,
        estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      addNotification({ type: "success", message: "Task created!" });
      setForm({ title: "", description: "", priority: "medium", category: "other", dueDate: "", estimatedMinutes: "", tags: "" });
      onClose();
    } catch {
      addNotification({ type: "error", message: "Failed to create task" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Task" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="task-form" loading={loading}>Create Task</Button>
      </>
    }>
      <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" required />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
            options={[{ value: "critical", label: "🔴 Critical" }, { value: "high", label: "🟠 High" }, { value: "medium", label: "🟡 Medium" }, { value: "low", label: "⚪ Low" }]} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={["work","fitness","learning","personal","health","finance","social","other"].map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Input label="Est. Time (min)" type="number" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })} placeholder="e.g. 30" min="1" />
        </div>
        <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. backend, urgent" />
      </form>
    </Modal>
  );
}
