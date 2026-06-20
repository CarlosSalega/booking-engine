# Exploration: Dashboard

## Current State

### What EXISTS in the codebase

| Layer | Status | Details |
|-------|--------|---------|
| **Auth (Prisma)** | ✅ Complete | User, Session, Account, Verification models. Better Auth v1.6.19 with prisma-adapter. |
| **Auth (proxy)** | ✅ Complete | `proxy.ts` enforces session on all non-public routes. Redirects to `/login?next=...`. |
| **Auth (RBAC)** | ✅ Complete | 4 roles: ADMIN, SECRETARY, PROFESSIONAL, PATIENT. Permission map defined in `roles.ts`. |
| **Domain modules** | ✅ Pure domain only | bookings, patients, services, professionals, payments — each has types, Zod schemas, pure functions. **NO Prisma models. NO DB tables.** |
| **UI components** | ⚠️ Minimal | Only `button.tsx` installed via shadcn/ui. Theme fully configured in `globals.css` (oklch, sidebar tokens, chart tokens present). |
| **Charts** | ❌ None | No `recharts` or any chart library in `package.json`. |
| **Dashboard route** | ❌ None | No `/dashboard` route exists. Root `page.tsx` is a placeholder. |

### Critical constraint

The dashboard feature doc (§8) says: *"datos siempre reflejan estado real de base de datos"*. But there are NO Prisma models for bookings, patients, payments, services, or professionals. The only queryable data from DB is `User` (with `role` field) and `Session`.

This means the dashboard **cannot** show real business metrics yet. The domain modules are pure TypeScript — types, consts, state machines, Zod schemas — but have zero persistence layer.

### What the proxy already gives us

```
proxy.ts matcher: /((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)
```

Any route under `/dashboard` is ALREADY protected — unauthenticated users get redirected to `/login`. No additional auth wiring needed for route protection. RBAC (role-based access WITHIN the dashboard) is a separate concern.

---

## Affected Areas

- `src/app/(dashboard)/` — **NEW** route group with sidebar layout
- `src/app/proxy.ts` — No changes needed (already protects all non-public routes)
- `src/components/ui/` — Needs ~12 new shadcn/ui components (sidebar, card, chart, table, etc.)
- `package.json` — Needs `recharts` (or alternative) for chart widgets
- `src/modules/dashboard/` — **NEW** module (presentation layer + mock data adapters)
- `src/modules/auth/domain/roles.ts` — Reference only (RBAC mapping for dashboard widgets)

---

## Approaches

### 1. Mock-First Dashboard (Recommended)

Build the full dashboard UI with fixture/mock data. Create a data adapter layer that will later be swapped for real Prisma queries.

**Pros:**
- Delivers visible value fast — layout, navigation, RBAC skeleton, responsive design
- Validates the component architecture and design system end-to-end
- Clear separation: UI layer vs. data layer (adapter pattern)
- Does NOT block on domain modules that aren't built yet
- Can be built in small chained PRs (sidebar → cards → charts → table)

**Cons:**
- Dashboard shows fake data until domain Prisma models exist
- Adapter swap is future work (but trivial if interface is well-defined)
- Feature doc says "real data" — stakeholders must understand this is phase 1

**Effort:** Medium (3-4 chained PRs, ~800-1000 lines total)

### 2. Prisma Models First, Then Dashboard

Build Prisma models + repositories for bookings, patients, payments, services, professionals. Then build dashboard with real queries.

**Pros:**
- Dashboard shows real data from day one
- Satisfies feature doc §8 literally

**Cons:**
- MASSIVE scope increase — 5 Prisma models + migrations + repositories + seed data
- Domain Prisma models are a separate concern (they belong to their own changes)
- Blocks dashboard delivery on domain decisions not yet made
- Violates single-responsibility per change (openspec rule: "scoped to a single domain change")

**Effort:** Very High (10+ PRs, 2000+ lines)

### 3. Hybrid: Dashboard Shell + One Real Metric

Build dashboard shell with mock data, but implement ONE metric with real data (e.g., "users registered" from the User table) to prove the data flow.

**Pros:**
- Shows real data for at least one widget
- Proves the adapter pattern works end-to-end
- Still keeps scope manageable

**Cons:**
- Slightly more complex than pure mock (need one server action + query)
- Only 1 of ~6 metrics is real — might feel inconsistent

**Effort:** Medium (similar to approach 1, +1 PR for real data adapter)

---

## Recommendation

**Approach 1: Mock-First Dashboard** with a well-defined data adapter interface.

**Why:**
1. The domain modules are explicitly PURE DOMAIN — they were designed to be framework-agnostic and testable. Adding Prisma models for them is a SEPARATE change (one per domain module, following the existing pattern).
2. The dashboard change should focus on what it controls: layout, navigation, RBAC-based widget visibility, responsive design, and the component architecture.
3. The adapter interface (`DashboardDataProvider`) can be defined now with the exact shape the dashboard needs. When domain Prisma models land, implementing the adapter is a straightforward mapping exercise.
4. This keeps the change scoped and reviewable within the 400-line-per-PR budget using chained PRs.

**The adapter interface should look like:**

```typescript
// src/modules/dashboard/application/dashboard-data.provider.ts
export interface DashboardMetrics {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: Money;
  cancellations: number;
  newPatients: number;
  calendarOccupancy: number; // 0-100
}

export interface DashboardDataProvider {
  getMetrics(dateRange: DateRange): Promise<DashboardMetrics>;
  getTodayBookings(): Promise<BookingSummary[]>;
  getRevenueByMonth(months: number): Promise<RevenuePoint[]>;
  getBookingsByDay(days: number): Promise<BookingPoint[]>;
  getTopServices(limit: number): Promise<ServiceRanking[]>;
  getQuickActions(role: UserRoleType): Promise<QuickAction[]>;
}
```

The mock implementation returns fixture data. The real implementation (future) queries Prisma.

---

## UI Component Inventory

### shadcn/ui components to install

| Component | Purpose | Dashboard Section |
|-----------|---------|-------------------|
| `sidebar` | Collapsible navigation | App shell (sidebar-07 pattern) |
| `card` | Metric widgets | SectionCards (KPIs) |
| `chart` | Chart wrapper | Revenue/bookings charts (needs `recharts`) |
| `table` | Data display | Today's bookings, recent activity |
| `badge` | Status indicators | Booking status, payment status |
| `avatar` | User display | Header, professional ranking |
| `breadcrumb` | Navigation context | Page header |
| `separator` | Visual division | Sidebar sections |
| `tooltip` | Icon-only sidebar | Collapsed sidebar state |
| `sheet` | Mobile sidebar | Mobile navigation |
| `dropdown-menu` | User menu | Header actions |
| `button` | ✅ Already installed | Throughout |

### npm dependency to add

- `recharts` — chart rendering (used by shadcn/ui `chart` component)

---

## RBAC → Dashboard Mapping

| Widget | ADMIN | SECRETARY | PROFESSIONAL | PATIENT |
|--------|-------|-----------|--------------|---------|
| All metrics | ✅ | ✅ | Own only | ❌ (no dashboard) |
| Revenue (global) | ✅ | ✅ | ❌ | ❌ |
| Today's bookings | ✅ All | ✅ All | ✅ Own | ❌ |
| Patient list | ✅ | ✅ | ✅ Booked only | ❌ |
| Quick actions (all) | ✅ | ✅ (operational) | ❌ | ❌ |
| Charts (global) | ✅ | ✅ | Own only | ❌ |
| Top services | ✅ | ✅ | ❌ | ❌ |

**PATIENT role** should NOT access `/dashboard` at all. The proxy already handles auth; RBAC enforcement within the dashboard is a layout-level concern (redirect PATIENT to a different page or show a "no access" state).

---

## Route & Layout Strategy

```
src/app/
├── (dashboard)/
│   ├── layout.tsx          ← Server Component: sidebar + main shell
│   ├── dashboard/
│   │   └── page.tsx        ← Server Component: orchestrates widgets
│   └── _components/
│       ├── app-sidebar.tsx  ← Client: collapsible sidebar (sidebar-07)
│       ├── nav-main.tsx     ← Client: navigation links
│       ├── nav-user.tsx     ← Client: user dropdown in sidebar
│       ├── header.tsx       ← Server: breadcrumb + user avatar
│       ├── metrics-grid.tsx ← Server: KPI cards (SectionCards)
│       ├── chart-area.tsx   ← Client: Recharts interactive charts
│       ├── today-bookings.tsx ← Server: booking list table
│       └── quick-actions.tsx ← Server: action buttons
```

### Server vs Client split

| Component | Render | Why |
|-----------|--------|-----|
| `layout.tsx` | Server | Static shell, no interactivity |
| `app-sidebar.tsx` | Client | Collapse/expand state, responsive toggle |
| `page.tsx` | Server | Data fetching, composition |
| `metrics-grid.tsx` | Server | Receives data as props, no state |
| `chart-area.tsx` | Client | Recharts needs browser (SVG interaction, tooltips) |
| `today-bookings.tsx` | Server | Static list, receives data as props |
| `quick-actions.tsx` | Server | Links/buttons, no client state |

### Key Next.js 16 patterns

- **No `middleware.ts`** — proxy.ts already handles auth ✅
- **`use cache`** for dashboard data functions (with `cacheLife` for TTL)
- **`Suspense` boundaries** around `cookies()`/`headers()` calls to keep PPR viable
- **Server Actions** for any mutations (quick actions that create bookings, etc.)

---

## Data Flow (Mock Phase)

```
┌─────────────────────────────────────────────────────────┐
│  page.tsx (Server Component)                            │
│                                                         │
│  1. Get session → extract user role                     │
│  2. Call dashboardDataProvider.getMetrics()             │
│  3. Call dashboardDataProvider.getTodayBookings()       │
│  4. Pass data as props to child components              │
└──────────────┬──────────────────────────────────────────┘
               │ props
    ┌──────────┼──────────┬──────────────┐
    ▼          ▼          ▼              ▼
 Metrics   Charts     Bookings     QuickActions
 (Server)  (Client)   (Server)     (Server)
```

### Mock data location

```
src/modules/dashboard/
├── domain/
│   ├── dashboard.types.ts      ← DashboardMetrics, BookingSummary, etc.
│   └── index.ts
├── application/
│   ├── dashboard-data.provider.ts  ← Interface
│   └── index.ts
├── infrastructure/
│   ├── mock-dashboard-data.provider.ts  ← Mock implementation
│   └── index.ts
└── presentation/
    └── (lives in src/app/(dashboard)/_components/)
```

---

## Risks

1. **Scope creep from stakeholders** — "Why fake data?" → Must communicate this is phase 1 of a phased approach. The adapter interface is the contract.
2. **Recharts bundle size** — Recharts is ~200KB gzipped. It should be dynamically imported (`next/dynamic`) so it doesn't bloat the initial page load. Charts are below-the-fold anyway.
3. **Sidebar responsive behavior** — The sidebar-07 pattern uses CSS + JS for collapse. Must test tablet (768px) and mobile (320px) breakpoints carefully.
4. **PATIENT role access** — The proxy lets any authenticated user through. Need explicit role check at the dashboard layout level to redirect PATIENTs.
5. **Chart dark mode** — Recharts doesn't use Tailwind classes. Must use `var()` constants per the tailwind-4 skill for chart colors (the theme already defines `--chart-1` through `--chart-5` tokens ✅).
6. **Component installation overhead** — 12 shadcn/ui components to install. Each is a CLI command + verification. Must batch these in a single setup PR.

---

## Proposed Chained PR Structure

| PR | Scope | Est. Lines |
|----|-------|------------|
| **#1: Foundation** | Install recharts + 12 shadcn/ui components. Create dashboard module skeleton (types, interfaces, mock provider). | ~250 |
| **#2: Shell + Sidebar** | `(dashboard)/layout.tsx`, `app-sidebar.tsx` (collapsible, sidebar-07), `nav-main.tsx`, `nav-user.tsx`, `header.tsx`. RBAC gate (redirect PATIENT). | ~350 |
| **#3: Metrics + Quick Actions** | `metrics-grid.tsx` (SectionCards with KPIs), `quick-actions.tsx`. Wire mock data to page. | ~200 |
| **#4: Charts + Table** | `chart-area.tsx` (Recharts: revenue by month, bookings by day), `today-bookings.tsx` (data table). Dynamic import for charts. | ~350 |

Total: ~1150 lines across 4 PRs, each within or near the 400-line budget.

---

## Ready for Proposal

**Yes.** The exploration has enough context to proceed to `sdd-propose`. The key decisions are:

1. **Mock-first** approach with adapter pattern
2. **4 chained PRs** for reviewability
3. **PATIENT role excluded** from dashboard
4. **Recharts** for charts (dynamic import)
5. **Sidebar-07** pattern for responsive navigation

The orchestrator should tell the user: *"We'll build the dashboard UI with mock data first, using an adapter pattern so real data can be plugged in later when domain Prisma models are ready. The dashboard will be split into 4 chained PRs: foundation, shell+sidebar, metrics, and charts+table."*
