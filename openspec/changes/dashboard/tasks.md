# Tasks: Dashboard

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200 (data + UI) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (split into 2 PRs) |
| Suggested split | PR 1: data + tests + layout/shell. PR 2: widgets + charts + page composition. |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No (chained PRs recommended but a single deliverable was shipped in this batch).
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Phase 1: Foundation (data layer + TDD + layout/shell)

- [x] 1.1 Install shadcn/ui components (sidebar, card, table, breadcrumb, separator, avatar, dropdown-menu, sheet, input, badge, skeleton, tooltip, chart).
- [x] 1.2 Install `recharts` for chart rendering.
- [x] 1.3 Create `src/modules/dashboard/data/dashboard-data.ts` — pure data access for metrics, today's bookings, recent activity, top services, revenue by month, bookings by day.
- [x] 1.4 Create `src/modules/dashboard/data/__tests__/dashboard-data.test.ts` — 13 tests (RED → GREEN → REFACTOR). Prisma singleton is mocked; tests verify shape, organization scoping, and zero-filling.
- [x] 1.5 Create `src/modules/dashboard/data/get-organization-id.ts` — resolves the active organization via the first Professional record, with a module-level cache. Redirects to /login when no session, throws when no organization.
- [x] 1.6 Create `src/modules/dashboard/data/__tests__/get-organization-id.test.ts` — 4 tests covering redirect, cache, and missing-org error path.
- [x] 1.7 Create `src/modules/dashboard/presentation/formatters.ts` — es-AR Intl helpers (currency, number, time, relative time, status labels).
- [x] 1.8 Create `src/app/(dashboard)/layout.tsx` — SidebarProvider, RBAC gate (redirects PATIENT to /), renders sidebar + site header.
- [x] 1.9 Create `src/components/dashboard/sidebar.tsx` — collapsible sidebar (sidebar-07 pattern) with role-filtered nav groups and user dropdown.
- [x] 1.10 Create `src/components/dashboard/site-header.tsx` — breadcrumb + sidebar trigger.
- [x] 1.11 Create `src/components/dashboard/charts.tsx` — client-only dynamic-import wrappers around the Recharts components (Next.js 16 forbids `ssr: false` in Server Components).
- [x] 1.12 Wrap the app with `TooltipProvider` in `src/app/layout.tsx` (required by shadcn/ui tooltip).
- [x] 1.13 Update `src/app/page.tsx` to redirect non-PATIENT authenticated users to /dashboard and to show a minimal landing for everyone else.
- [x] 1.14 Fix `src/hooks/use-mobile.ts` lint errors (avoid setState in effect, no implicit coercion).

## Phase 2: Widgets + Page composition

- [x] 2.1 Create `src/components/dashboard/metrics-cards.tsx` — 6 KPI cards (today/week bookings, month revenue, cancellations, new patients, occupancy).
- [x] 2.2 Create `src/components/dashboard/today-bookings.tsx` — table of today's bookings with status badge and empty state.
- [x] 2.3 Create `src/components/dashboard/recent-activity.tsx` — list of last 10 events (bookings, payments, patients) with relative time.
- [x] 2.4 Create `src/components/dashboard/top-services.tsx` — top 5 services with progress bar.
- [x] 2.5 Create `src/components/dashboard/revenue-chart.tsx` — Recharts AreaChart for revenue by month.
- [x] 2.6 Create `src/components/dashboard/bookings-chart.tsx` — Recharts BarChart for bookings by day.
- [x] 2.7 Create `src/app/(dashboard)/dashboard/page.tsx` — composes all widgets behind Suspense boundaries.
- [x] 2.8 Create `src/modules/dashboard/index.ts` — module barrel.

## Phase 3: Verification

- [x] 3.1 `pnpm test` — 206 / 206 pass (was 189 before this change, +17 dashboard tests).
- [x] 3.2 `pnpm type-check` — clean.
- [x] 3.3 `pnpm lint` — clean.
- [x] 3.4 `pnpm build` — production build succeeds, dashboard route registered.
