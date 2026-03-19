"use client";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef, ButtonHTMLAttributes } from "react";

// ─── CVA utility ─────────────────────────────────────────────────────────────
// We use a simple inline implementation so we don't need to install CVA.

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500",
  secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
  ghost: "bg-transparent hover:bg-white/10 text-white/80 hover:text-white border border-transparent",
  danger: "bg-red-600/80 hover:bg-red-500 text-white border border-red-500",
  success: "bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "text-xs px-2 py-1 rounded-md gap-1",
  sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2 rounded-lg gap-2",
  lg: "text-base px-6 py-3 rounded-xl gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className = "", disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.01 }}
        className={`
          inline-flex items-center justify-center font-medium transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={disabled || loading}
        {...(props as HTMLMotionProps<"button">)}
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : icon}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-white/80",
  success: "bg-emerald-500/20 text-emerald-400",
  warning: "bg-amber-500/20 text-amber-400",
  danger: "bg-red-500/20 text-red-400",
  info: "bg-blue-500/20 text-blue-400",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-white/70">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            {icon}
          </span>
        )}
        <input
          className={`
            w-full bg-white/5 border border-white/10 text-white placeholder-white/30
            rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
            transition-colors duration-150
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-500/50" : ""}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-white/70">{label}</label>}
      <select
        className={`
          w-full bg-white/5 border border-white/10 text-white
          rounded-lg px-3 py-2 text-sm
          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
          transition-colors duration-150
          ${error ? "border-red-500/50" : ""}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-white/70">{label}</label>}
      <textarea
        className={`
          w-full bg-white/5 border border-white/10 text-white placeholder-white/30
          rounded-lg px-3 py-2 text-sm resize-none
          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
          transition-colors duration-150
          ${error ? "border-red-500/50" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: string;
}

export function Card({ children, className = "", hover = false, glow }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      className={`
        bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl
        ${glow ? `shadow-lg ${glow}` : ""}
        ${hover ? "cursor-pointer transition-shadow hover:border-white/20" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  hexColor?: string; // inline hex/rgb color — use when color is dynamic
  height?: string;
  animated?: boolean;
}

export function ProgressBar({ value, color = "bg-indigo-500", hexColor, height = "h-2", animated = true }: ProgressBarProps) {
  return (
    <div className={`w-full bg-white/10 rounded-full overflow-hidden ${height}`}>
      <motion.div
        className={`${height} ${hexColor ? "" : color} rounded-full`}
        style={hexColor ? { backgroundColor: hexColor } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: animated ? 0.8 : 0, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <svg className={`animate-spin text-indigo-400 ${sizes[size]}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" };
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white`}>
      {initials}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`border-t border-white/10 ${className}`} />;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-white/80 font-semibold text-lg mb-2">{title}</h3>
      {description && <p className="text-white/40 text-sm max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, sub, icon, color = "text-indigo-400", trend }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-white/50"}`}>
          <span>{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}</span>
          <span>vs last period</span>
        </div>
      )}
    </Card>
  );
}
