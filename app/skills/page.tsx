"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSkillsStore, useUIStore } from "@/presentation/store";
import { Card, Button, StatCard, ProgressBar, EmptyState, Input, Select } from "@/presentation/components/ui";
import { Modal } from "@/presentation/components/ui/Modal";
import { levelProgressPercent } from "@/core/rules/calculations";
import type { Skill } from "@/core/entities/types";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  technical: "#6366f1",
  physical: "#f59e0b",
  mental: "#0ea5e9",
  creative: "#ec4899",
  social: "#a855f7",
  leadership: "#10b981",
  other: "#6b7280",
};

export default function SkillsPage() {
  const { skills, loading, fetchSkills } = useSkillsStore();
  const { addNotification } = useUIStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showAddXP, setShowAddXP] = useState<string | null>(null);

  useEffect(() => { fetchSkills(); }, []);

  const totalLevel = skills.reduce((s, sk) => s + sk.level, 0);
  const totalXP = skills.reduce((s, sk) => s + sk.totalXP, 0);

  // Build radar data
  const radarData = Object.entries(CATEGORY_COLORS).map(([cat]) => {
    const catSkills = skills.filter((s) => s.category === cat);
    const avgLevel = catSkills.length ? Math.round(catSkills.reduce((s, sk) => s + sk.level, 0) / catSkills.length) : 0;
    return { category: cat.charAt(0).toUpperCase() + cat.slice(1), level: avgLevel };
  }).filter((d) => d.level > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Skills" value={skills.length} icon="🎯" color="text-indigo-400" />
        <StatCard label="Total Levels" value={totalLevel} icon="📈" color="text-purple-400" />
        <StatCard label="Total XP Earned" value={totalXP.toLocaleString()} icon="⚡" color="text-amber-400" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} icon={<span>+</span>}>New Skill</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Radar chart */}
        {radarData.length >= 3 && (
          <Card className="p-6">
            <h3 className="text-white font-semibold mb-4">Skill Profile</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#ffffff60", fontSize: 11 }} />
                <Radar dataKey="level" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Skills list */}
        <div className={`${radarData.length >= 3 ? "lg:col-span-2" : "lg:col-span-3"} space-y-3`}>
          {skills.length === 0 ? (
            <EmptyState icon="🎯" title="No skills yet" description="Add skills to track your progression" action={<Button onClick={() => setShowCreate(true)}>Add First Skill</Button>} />
          ) : (
            skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onAddXP={() => setShowAddXP(skill.id)} />
            ))
          )}
        </div>
      </div>

      <CreateSkillModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      {showAddXP && <AddXPModal skillId={showAddXP} onClose={() => setShowAddXP(null)} />}
    </div>
  );
}

function SkillCard({ skill, onAddXP }: { skill: Skill; onAddXP: () => void }) {
  const progress = levelProgressPercent(skill);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${skill.color}20`, border: `1px solid ${skill.color}40` }}>
          {skill.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold">{skill.name}</h3>
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-xs capitalize">{skill.progressionModel}</span>
              <Button size="xs" variant="ghost" onClick={onAddXP}>+ XP</Button>
            </div>
          </div>
          {skill.description && <p className="text-white/40 text-xs mb-2">{skill.description}</p>}

          <div className="flex items-center gap-4 mb-2">
            <div>
              <span className="text-2xl font-black" style={{ color: skill.color }}>{skill.level}</span>
              <span className="text-white/30 text-xs ml-1">/ ∞</span>
            </div>
            <div className="text-sm">
              <span className="text-white/60">{skill.currentXP}</span>
              <span className="text-white/30"> / {skill.xpToNextLevel} XP</span>
            </div>
            <div className="text-white/30 text-xs">Total: {skill.totalXP.toLocaleString()} XP</div>
          </div>

          <ProgressBar value={progress} hexColor={skill.color} height="h-2" />
          <p className="text-white/30 text-xs mt-1">{progress}% to level {skill.level + 1}</p>
        </div>
      </div>
    </motion.div>
  );
}

function CreateSkillModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { createSkill } = useSkillsStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category: "other",
    progressionModel: "linear", color: "#6366f1", icon: "⚡",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createSkill({
        name: form.name,
        description: form.description || null,
        category: form.category as Skill["category"],
        progressionModel: form.progressionModel as Skill["progressionModel"],
        color: form.color,
        icon: form.icon,
      });
      addNotification({ type: "success", message: "Skill created!" });
      setForm({ name: "", description: "", category: "other", progressionModel: "linear", color: "#6366f1", icon: "⚡" });
      onClose();
    } catch {
      addNotification({ type: "error", message: "Failed to create skill" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Skill" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="skill-form" loading={loading}>Create Skill</Button>
      </>
    }>
      <form id="skill-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Skill Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Machine Learning" required />
        <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this skill covers..." />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={["technical","physical","mental","creative","social","leadership","other"].map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <Select label="Progression" value={form.progressionModel} onChange={(e) => setForm({ ...form, progressionModel: e.target.value })}
            options={[{ value: "linear", label: "Linear" }, { value: "exponential", label: "Exponential" }, { value: "fibonacci", label: "Fibonacci" }]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Icon (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="⚡" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-white/70">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 bg-white/5 border border-white/10 rounded-lg cursor-pointer" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AddXPModal({ skillId, onClose }: { skillId: string; onClose: () => void }) {
  const { skills, addXP } = useSkillsStore();
  const { addNotification } = useUIStore();
  const skill = skills.find((s) => s.id === skillId);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ amount: "50", description: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await addXP(skillId, parseInt(form.amount), form.description || `Manual XP grant`);
      addNotification({ type: "success", message: `+${form.amount} XP added to ${skill?.name}!` });
      onClose();
    } catch {
      addNotification({ type: "error", message: "Failed to add XP" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Add XP to ${skill?.name}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="xp-form" loading={loading}>Add XP</Button>
      </>
    }>
      <form id="xp-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="XP Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="1" required />
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you accomplish?" />
      </form>
    </Modal>
  );
}
