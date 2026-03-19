"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/presentation/store";

export function NotificationToaster() {
  const { notifications, removeNotification } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <Notification key={n.id} {...n} onDismiss={() => removeNotification(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface NotificationProps {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
  onDismiss: () => void;
}

const typeConfig = {
  success: { icon: "✅", border: "border-emerald-500/50", bg: "bg-emerald-500/10" },
  error: { icon: "❌", border: "border-red-500/50", bg: "bg-red-500/10" },
  info: { icon: "ℹ️", border: "border-blue-500/50", bg: "bg-blue-500/10" },
  warning: { icon: "⚠️", border: "border-amber-500/50", bg: "bg-amber-500/10" },
};

function Notification({ type, message, duration = 4000, onDismiss }: NotificationProps) {
  const config = typeConfig[type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${config.border} ${config.bg} backdrop-blur-sm shadow-xl max-w-xs`}
    >
      <span>{config.icon}</span>
      <p className="text-white/90 text-sm flex-1">{message}</p>
      <button onClick={onDismiss} className="text-white/40 hover:text-white text-xs ml-2">✕</button>
    </motion.div>
  );
}
