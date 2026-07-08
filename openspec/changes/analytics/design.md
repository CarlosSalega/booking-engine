# Design: Analytics Module

## Technical Approach

New `src/modules/analytics/` module mirroring the settings module's layered structure (`domain/` → `data/` → `actions/` → `presentation/`). All aggregations use Prisma `groupBy` + `_sum`/`_count`/`_avg` against existing `Booking`, `Payment`, `Patient`, `Professional`, `Service` models — zero in-memory grouping. No migration required. New route `/(dashboard)/dashboard/analytics` following the settings module pattern: route file provides a **single `<Suspense>` boundary** wrapping `<AnalyticsPage />` (pure RSC body with no internal Suspense). RBAC: layout-level gate (PATIENT → redirect) + action-level defense-in-depth (PATIENT blocked, PROFESSIONAL auto-scoped, ADMIN/SECRETARY org-wide).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single `analytics-data.ts` vs repo + cache split | No cache needed (low admin traffic); split adds ceremony without value | Single file, mirrors `settings-data.ts` |
| `useTransition + useState` vs `useActionState` | `useActionState` is React 19 idiomatic but project convention already uses `useTransition + useState` | Follow project convention (`useTransition + useState`) |
| `SettingsResult<T>` discriminated union vs try/catch | Typed union enables TypeScript narrowing; try/catch loses type safety at boundary | `SettingsResult<T>` — same pattern as settings actions |
| URL searchParams vs React state for date range | State resets on navigation; searchParams survive refresh and are shareable | searchParams — enables bookmarkable analytics |
| `SettingsGuard` reuse vs layout-level RBAC | `SettingsGuard` is readOnly-aware (SECRETARY); analytics has different role matrix (PROFESSIONAL allowed) | Layout-level RBAC + action defense-in-depth — `SettingsGuard` not reused |
| Empty arrays vs null for no-data periods | Null forces `?` checks in every UI component; empty arrays render naturally | Empty arrays/zeroed objects — no null checks needed |
| Dynamic import w/ `ssr: false` vs inline Recharts | Recharts uses browser APIs; SSR would cause hydration mismatches | Dynamic import per chart component |
| Per-chart `<Suspense>` vs single route-level `<Suspense>` | Single action returns all data at once — per-chart Suspense has zero streaming benefit and adds complexity | Single route-level `<Suspense>` — matches `settings/page.tsx` pattern. Route wraps `<AnalyticsPage />` in one `<Suspense fallback={<AnalyticsSkeleton />}>` |

## Data Flow

```
page.tsx (Route RSC)
 └── <Suspense fallback={<AnalyticsSkeleton />}>
      └── <AnalyticsPage /> (pure RSC body)
            │  await getAnalyticsAction({ dateRange, professionalUserId? })
            │  resolves once → returns full AnalyticsResponse
            ▼
      <KPICards data={analytics} />
      <RevenueChart data={analytics.revenue} />
      <PeakHoursChart data={analytics.peakHours} />
      <DayDistributionChart data={analytics.dayDistribution} />
      ... all children render immediately, no nested Suspense

DateRangeFilter (Client) ── useTransition + useState
     │  calls getAnalyticsAction(), updates URL searchParams
     ▼
getAnalyticsAction (Server Action) ← input: AnalyticsQueryInput
     │  1. Zod validation (analyticsQuerySchema)
     │  2. getSession() → role resolution
     │  3. RBAC: PATIENT→block, PROFESSIONAL→inject professionalUserId
     │  4. getOrganizationId()
     │  5. Calls analytics-data.ts functions (10 parallel Prisma queries)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/analytics/domain/types.ts` | Create | DateRange, Metric interfaces, AnalyticsResponse (incl. peakHours, dayDistribution) |
| `src/modules/analytics/domain/schemas.ts` | Create | dateRangeSchema, analyticsQuerySchema (Zod 4) |
| `src/modules/analytics/domain/constants.ts` | Create | DATE_RANGE_PRESETS, METRIC_LABELS |
| `src/modules/analytics/domain/helpers.ts` | Create | getDateBoundaries(range, timezone), formatMetricValue |
| `src/modules/analytics/domain/index.ts` | Create | Domain barrel |
| `src/modules/analytics/data/analytics-data.ts` | Create | 10 Prisma groupBy aggregation functions |
| `src/modules/analytics/data/index.ts` | Create | Data barrel |
| `src/modules/analytics/actions/analytics-actions.ts` | Create | getAnalyticsAction + RBAC + Zod → AnalyticsResult |
| `src/modules/analytics/actions/analytics-actions.types.ts` | Create | AnalyticsResult<T>, AnalyticsQueryInput types |
| `src/modules/analytics/actions/index.ts` | Create | Actions barrel |
| `src/modules/analytics/presentation/analytics-page.tsx` | Create | Pure RSC body: awaits action, renders all children directly (no internal Suspense) |
| `src/modules/analytics/presentation/date-range-filter.tsx` | Create | Client Component: presets + custom inputs |
| `src/modules/analytics/presentation/kpi-cards.tsx` | Create | 4 KPI cards (Server Component) |
| `src/modules/analytics/presentation/revenue-chart.tsx` | Create | Recharts AreaChart (dynamic import) |
| `src/modules/analytics/presentation/bookings-chart.tsx` | Create | Recharts PieChart by status |
| `src/modules/analytics/presentation/occupancy-chart.tsx` | Create | Recharts BarChart |
| `src/modules/analytics/presentation/temporal-charts.tsx` | Create | Recharts BarCharts: peak hours + day-of-week distribution |
| `src/modules/analytics/presentation/top-services.tsx` | Create | Ranked service list |
| `src/modules/analytics/presentation/top-professionals.tsx` | Create | Ranked professional list + filter |
| `src/modules/analytics/presentation/analytics-skeleton.tsx` | Create | Loading skeleton (full page) |
| `src/modules/analytics/presentation/analytics-error.tsx` | Create | Error boundary fallback |
| `src/modules/analytics/presentation/analytics-empty.tsx` | Create | Empty state for no-data ranges |
| `src/modules/analytics/index.ts` | Create | Module barrel |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | Create | Route entry: Header + single Suspense + AnalyticsPage |
| `src/modules/auth/domain/roles.ts` | Modify | Add `analytics:view` to ADMIN, SECRETARY, PROFESSIONAL |
| `src/components/dashboard/sidebar.tsx` | Modify | Add "Analíticas" nav item (BarChart3 icon) |

## Interfaces / Contracts

```typescript
// domain/types.ts
type DateRange =
  | { preset: "7d" | "30d" | "3mo" | "6mo" }
  | { preset: "custom"; from: Date; to: Date };

interface RevenueMetric {
  total: number;
  averagePerBooking: number;
  dailyRevenue: { date: string; amount: number }[];
  monthlyRevenue: { month: string; amount: number }[];
}

interface BookingMetric {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  completionRate: number;
}

interface OccupancyMetric {
  occupiedSlots: number;
  totalSlots: number;
  rate: number;
}

interface PatientMetric {
  newPatients: number;
  returningPatients: number;
  totalUnique: number;
}

interface ServiceMetric {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
}

interface ProfessionalMetric {
  professionalUserId: string;
  name: string;
  count: number;
  revenue: number;
  occupancyRate: number;
}

interface PeakHourMetric {
  hour: number;
  count: number;
}

interface DayDistributionMetric {
  dayOfWeek: number;
  count: number;
}

interface AnalyticsResponse {
  revenue: RevenueMetric;
  bookings: BookingMetric;
  occupancy: OccupancyMetric;
  patients: PatientMetric;
  topServices: ServiceMetric[];
  topProfessionals: ProfessionalMetric[];
  peakHours: PeakHourMetric[];
  dayDistribution: DayDistributionMetric[];
}

// actions
type AnalyticsResult<T> = { success: true; data: T } | { success: false; error: string };
type AnalyticsQueryInput = { dateRange: DateRange; professionalUserId?: string };
getAnalyticsAction(input: AnalyticsQueryInput): Promise<AnalyticsResult<AnalyticsResponse>>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Domain | Schemas (valid/invalid), helpers (timezone boundaries), constants | Vitest, 100% coverage |
| Data | All 10 aggregation functions with mocked Prisma (empty results, null amounts, multiple ranges) | Vitest + mocked Prisma client |
| Actions | Every RBAC path (ADMIN, SECRETARY, PROFESSIONAL, PATIENT, unauthenticated), Zod validation errors, Prisma errors | Vitest + mocked auth/data layers |
| Presentation | Loading/empty/error/success states per component, DateRangeFilter interactions | Vitest + React Testing Library |

Strict TDD per `openspec/config.yaml`: RED (failing test) → GREEN (minimal impl) → TRIANGULATE → REFACTOR.

## Migration / Rollout

No migration required. All data from existing `Booking`, `Payment`, `Patient`, `Professional`, `Service` models. Rollback: remove route, nav item, and permissions. Dashboard remains untouched.

## Open Questions

None. All constraints resolved: Prisma schema confirmed (no new models), settings module pattern studied, RBAC mechanism in place via layout + actions proxy pattern.
