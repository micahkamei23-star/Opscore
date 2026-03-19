# OPSCORE — Life Operating System

> An elite personal operations platform that unifies fitness tracking, task & habit management, skill progression, deep-work focus sessions, and real-time analytics into one coherent system.

![Dashboard](https://github.com/user-attachments/assets/7ee778a9-0ca9-4e50-9ade-9641ce6352eb)

---

## Features

| Module | Capabilities |
|---|---|
| **Dashboard** | Aggregated metrics, XP/training/habit charts, time-period filter (Today / Week / Month / Year) |
| **Fitness** | Workout logging with structured sets, progressive-overload history, bodyweight trend chart, RPE tracking |
| **Tasks** | Priority queue, status workflow (todo → in-progress → done), due-date tracking, overdue detection |
| **Habits** | Recurring habits, streak calculation, completion history, goal progress bars |
| **Skills** | XP + leveling system (linear / exponential / fibonacci curves), radar-chart skill profile |
| **Focus** | Session timer, deep-work analytics, focus-score tracking, XP rewards |
| **Profile** | Aggregated performance metrics, weekly/monthly breakdowns |

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript (strict mode)
- **Styling**: TailwindCSS + Framer Motion animations
- **Database**: SQLite via `better-sqlite3` (fully embedded, zero configuration)
- **State**: Zustand with clean server/UI separation
- **Charts**: Recharts

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database is created and seeded automatically on first run — no migrations to run manually.

```bash
# Production build
npm run build
npm start
```

---

## Architecture

The codebase follows a strict **4-layer architecture** with no cross-layer violations:

```
/core            ← Pure domain logic: entities, types, business rules, XP calculations
/application     ← Use-case orchestration (future expansion point)
/infrastructure  ← SQLite schema, migrations, seed data, repository pattern
/presentation    ← React pages, Zustand stores, reusable hooks
```

### Full Folder Structure

```
Opscore/
├── app/                        # Next.js App Router
│   ├── api/                    # REST API routes (Infrastructure layer)
│   │   ├── dashboard/
│   │   ├── fitness/
│   │   ├── habits/
│   │   ├── sessions/
│   │   ├── skills/
│   │   └── tasks/
│   ├── fitness/                # Page routes
│   ├── habits/
│   ├── profile/
│   ├── sessions/
│   ├── skills/
│   ├── tasks/
│   ├── layout.tsx
│   └── page.tsx                # Dashboard
│
├── core/                       # Domain layer — zero framework dependencies
│   ├── entities/
│   │   └── types.ts            # All domain types & interfaces
│   └── domain/
│       ├── xp.ts               # XP leveling curves
│       ├── habits.ts           # Streak calculation logic
│       └── fitness.ts          # Volume & load calculations
│
├── infrastructure/             # Data access layer
│   ├── db/
│   │   ├── connection.ts       # SQLite singleton
│   │   ├── schema.ts           # DDL — all table definitions
│   │   ├── seed.ts             # Deterministic seed data
│   │   └── init.ts             # Bootstrap (schema + seed, idempotent)
│   └── repositories/           # One repository per domain
│       ├── fitnessRepository.ts
│       ├── habitsRepository.ts
│       ├── sessionsRepository.ts
│       ├── skillsRepository.ts
│       └── tasksRepository.ts
│
├── presentation/               # UI layer
│   ├── components/             # Shared design-system components
│   │   ├── charts/             # AreaChart, BarChart, RadarChart wrappers
│   │   ├── layout/             # Sidebar, Header
│   │   └── ui/                 # StatCard, Modal, etc.
│   ├── hooks/                  # useDashboard, useFitness, useHabits, …
│   └── store/                  # Zustand stores per domain
│
├── lib/
│   ├── logger.ts               # Levelled logger (info / warn / error)
│   └── eventBus.ts             # Global pub/sub event bus
│
└── db/                         # SQLite database file (auto-created, git-ignored)
    └── opscore.db
```

---

## Seed Data

On first run the system auto-populates:

- **User**: Alex Chen (`alex@opscore.io`)
- **Skills**: Software Engineering (L12), Strength Training (L8), Deep Work (L6), Leadership (L5), Running (L4)
- **Workouts**: 4 sessions (Upper Body, Legs, Pull, Run) across the past week with full set data
- **Habits**: 5 habits with varying streaks (4–19 days)
- **Focus Sessions**: 5 completed sessions with focus scores and XP
- **Tasks**: 6 tasks across priorities and statuses
- **Bodyweight**: 7 data points over 28 days
- **XP Events**: 6 events linked to sessions, workouts, and habits

To reset to a fresh state, delete `db/opscore.db` and restart the server.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard?period=week` | Aggregated dashboard stats + chart data |
| GET/POST | `/api/fitness/workouts` | List / create workouts |
| GET/POST | `/api/fitness/bodyweight` | Bodyweight history |
| GET | `/api/fitness/exercises` | Exercise library |
| GET/POST | `/api/tasks` | List / create tasks |
| PATCH/DELETE | `/api/tasks/[id]` | Update / delete task |
| GET/POST | `/api/habits` | List / create habits |
| POST | `/api/habits/[id]/complete` | Mark habit complete for today |
| GET/POST | `/api/skills` | List / create skills |
| POST | `/api/skills/[id]/xp` | Award XP to a skill |
| GET/POST | `/api/sessions` | List / start focus sessions |
| PATCH | `/api/sessions/[id]` | Update session (pause/complete) |

---

## Engineering Standards

- **TypeScript strict mode** — zero `any`, all boundaries typed
- **Input validation** on all API routes with descriptive error responses
- **Centralized error handling** — no silent failures
- **Levelled logging** (`lib/logger.ts`) — info / warn / error
- **Referential integrity** — SQLite foreign keys enforced
- **Idempotent seed** — deterministic IDs, safe to run multiple times
- **No cross-layer violations** — UI never touches DB directly
