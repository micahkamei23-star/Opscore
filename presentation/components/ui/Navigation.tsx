"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/presentation/store";

const navItems = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/fitness", label: "Fitness", icon: "🏋️" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/habits", label: "Habits", icon: "🔥" },
  { href: "/skills", label: "Skills", icon: "🎯" },
  { href: "/sessions", label: "Focus", icon: "🧠" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 h-full w-64 bg-gray-950/95 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">
            OS
          </div>
          <div>
            <p className="text-white font-bold tracking-wide">OPSCORE</p>
            <p className="text-white/30 text-xs">Life Operating System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer
                    ${active
                      ? "bg-indigo-600/20 text-white border border-indigo-500/30"
                      : "text-white/50 hover:text-white/90 hover:bg-white/5"
                    }
                  `}
                >
                  <span className="text-xl w-6 text-center">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">AC</div>
            <div>
              <p className="text-white text-sm font-medium">Alex Chen</p>
              <p className="text-white/30 text-xs">alex@opscore.io</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export function TopBar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();

  const title = navItems.find((n) =>
    pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href))
  )?.label ?? "Dashboard";

  return (
    <header className="fixed top-0 left-0 right-0 z-20 lg:left-64 h-16 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-white font-semibold text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-white/30 text-sm hidden sm:block">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </div>
    </header>
  );
}
