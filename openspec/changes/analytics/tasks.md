# Tasks: Analytics Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2,050 – 2,625 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Domain types + schemas + constants + helpers | PR 1 | `feature/analytics` base; ~335 lines |
| 2 | Data: revenue + booking aggregation fns + tests | PR 2 | Base = PR 1 branch; ~385 lines |
| 3 | Data: remaining 8 aggregation fns + tests | PR 3 | Base = PR 2 branch; ~380 lines |
| 4 | Actions + RBAC + tests + permission change | PR 4 | Base = PR 3 branch; ~335 lines |
| 5 | Presentation: page + filter + KPI + skeleton/empty/error + sidebar | PR 5 | Base = PR 4 branch; ~380 lines |
| 6 | Presentation: chart components (revenue, bookings, occupancy) | PR 6 | Base = PR 5 branch; ~375 lines |
| 7 | Presentation: temporal charts + top lists | PR 7 | Base = PR 6 branch; ~355 lines |
| 8 | Integration: route entry + module barrel | PR 8 | Base = PR 7 branch; ~45 lines |

---

## Phase 1: Domain — Track 1 (PR #1)

- [x] 1.1 **RED**: Create `src/modules/analytics/domain/__tests__/types.test.ts` — type-level tests for DateRange, all metric interfaces, AnalyticsResponse (AND-001, AND-002)
- [x] 1.2 **GREEN**: Create `src/modules/analytics/domain/types.ts` — DateRange union, RevenueMetric, BookingMetric, OccupancyMetric, PatientMetric, ServiceMetric, ProfessionalMetric, PeakHourMetric, DayDistributionMetric, AnalyticsResponse
- [x] 1.3 **RED**: Create `src/modules/analytics/domain/__tests__/schemas.test.ts` — valid preset, custom without from/to fails, custom valid, from > to fails (AND-001 scenarios)
- [x] 1.4 **GREEN**: Create `src/modules/analytics/domain/schemas.ts` — dateRangeSchema, analyticsQuerySchema using Zod 4
- [x] 1.5 **REFACTOR**: Validate schemas pass `pnpm vitest run`
- [x] 1.6 **RED**: Create `src/modules/analytics/domain/__tests__/constants.test.ts` — DATE_RANGE_PRESETS has 4 entries, METRIC_LABELS maps all metrics
- [x] 1.7 **GREEN**: Create `src/modules/analytics/domain/constants.ts` — DATE_RANGE_PRESETS, METRIC_LABELS
- [x] 1.8 **RED**: Create `src/modules/analytics/domain/__tests__/helpers.test.ts` — Argentina timezone boundaries, 7d/30d/3mo/6mo presets, formatMetricValue (AND-004 scenarios)
- [x] 1.9 **GREEN**: Create `src/modules/analytics/domain/helpers.ts` — getDateBoundaries(range, timezone), formatMetricValue
- [x] 1.10 Create `src/modules/analytics/domain/index.ts` — barrel exports

## Phase 2: Data — Track 2 (PR #2–PR #3)

- [x] 2.1 **RED**: Create `src/modules/analytics/data/__tests__/revenue-metrics.test.ts` — mocked Prisma: getRevenueMetrics empty, with data, null amounts (AND-003, AND-005)
- [x] 2.2 **GREEN**: Create `src/modules/analytics/data/analytics-data.ts` — getRevenueMetrics() using `payment.groupBy` + `_sum`
- [x] 2.3 **RED**: Create `src/modules/analytics/data/__tests__/booking-metrics.test.ts` — getBookingMetrics: empty, confirmed-only, mixed statuses
- [x] 2.4 **GREEN**: Add getBookingMetrics() using `booking.groupBy` + `_count`
- [x] 2.5 Create `src/modules/analytics/data/index.ts` — barrel (revenue + booking)

## Phase 3: Data — Track 2 continued (PR #3)

- [x] 3.1 **RED**: Create `src/modules/analytics/data/__tests__/occupancy-metrics.test.ts` — getOccupancyMetrics: empty, partial slots, full
- [x] 3.2 **GREEN**: Add getOccupancyMetrics() using `booking.count` + available slots calculation
- [x] 3.3 **RED**: Create `src/modules/analytics/data/__tests__/patient-metrics.test.ts` — getPatientMetrics: new vs returning, empty
- [x] 3.4 **GREEN**: Add getPatientMetrics() using `patient.groupBy`
- [x] 3.5 **RED**: Create `src/modules/analytics/data/__tests__/service-metrics.test.ts` — getTopServices: ranked, empty, null revenue
- [x] 3.6 **GREEN**: Add getTopServices() using `booking.groupBy` with service join
- [x] 3.7 **RED**: Create `src/modules/analytics/data/__tests__/professional-metrics.test.ts` — getTopProfessionals: ranked, filtered, empty
- [x] 3.8 **GREEN**: Add getTopProfessionals() using `booking.groupBy` with professional join
- [x] 3.9 **RED**: Create `src/modules/analytics/data/__tests__/temporal-metrics.test.ts` — getPeakHours + getDayDistribution: empty, multiple hours/days
- [x] 3.10 **GREEN**: Add getPeakHours() + getDayDistribution() using `booking.groupBy` on hour/dayOfWeek
- [x] 3.11 **REFACTOR**: Update `src/modules/analytics/data/index.ts` — export all 10 functions

## Phase 4: Actions — Track 3 (PR #4)

- [ ] 4.1 **RED**: Create `src/modules/analytics/actions/__tests__/analytics-actions.types.test.ts` — AnalyticsResult<T> discriminated union narrowing
- [ ] 4.2 **GREEN**: Create `src/modules/analytics/actions/analytics-actions.types.ts` — AnalyticsResult<T>, AnalyticsQueryInput (mirrors SettingsResult pattern)
- [ ] 4.3 **RED**: Create `src/modules/analytics/actions/__tests__/analytics-actions.test.ts` — ADMIN full access, SECRETARY full, PROFESSIONAL auto-scoped, PATIENT blocked, unauthenticated, Zod validation error, Prisma error (ANA-001–ANA-004 scenarios)
- [ ] 4.4 **GREEN**: Create `src/modules/analytics/actions/analytics-actions.ts` — getAnalyticsAction: Zod validate → getSession → RBAC → parallel data calls → AnalyticsResult
- [ ] 4.5 Create `src/modules/auth/domain/roles.ts` — add `"analytics:view"` to ADMIN, SECRETARY, PROFESSIONAL arrays (AUTH-016)
- [ ] 4.6 Create `src/modules/analytics/actions/index.ts` — barrel exports

## Phase 5: Presentation Core — Track 4 (PR #5)

- [ ] 5.1 **RED**: Create `src/modules/analytics/presentation/__tests__/analytics-skeleton.test.tsx` — renders skeleton UI
- [ ] 5.2 **GREEN**: Create `src/modules/analytics/presentation/analytics-skeleton.tsx` — full-page loading skeleton
- [ ] 5.3 **RED**: Create `src/modules/analytics/presentation/__tests__/analytics-empty.test.tsx` — renders empty state message
- [ ] 5.4 **GREEN**: Create `src/modules/analytics/presentation/analytics-empty.tsx` — "No data available for this period"
- [ ] 5.5 **RED**: Create `src/modules/analytics/presentation/__tests__/analytics-error.test.tsx` — renders error + retry button
- [ ] 5.6 **GREEN**: Create `src/modules/analytics/presentation/analytics-error.tsx` — error boundary fallback with retry
- [ ] 5.7 **RED**: Create `src/modules/analytics/presentation/__tests__/kpi-cards.test.tsx` — formatted revenue, occupancy %, booking count, patient count (ANP-003)
- [ ] 5.8 **GREEN**: Create `src/modules/analytics/presentation/kpi-cards.tsx` — 4 KPI cards, Server Component
- [ ] 5.9 **RED**: Create `src/modules/analytics/presentation/__tests__/date-range-filter.test.tsx` — preset click triggers refetch, custom range validation (ANP-002)
- [ ] 5.10 **GREEN**: Create `src/modules/analytics/presentation/date-range-filter.tsx` — Client Component with presets + custom inputs, useTransition
- [ ] 5.11 **RED**: Create `src/modules/analytics/presentation/__tests__/analytics-page.test.tsx` — renders all children, empty state, error state (ANP-001)
- [ ] 5.12 **GREEN**: Create `src/modules/analytics/presentation/analytics-page.tsx` — RSC body: awaits action, renders KPI + charts directly
- [ ] 5.13 Modify `src/components/dashboard/sidebar.tsx` — add "Analíticas" nav item (BarChart3 icon) for ADMIN/SECRETARY/PROFESSIONAL

## Phase 6: Presentation Charts — Track 4 continued (PR #6)

- [ ] 6.1 **RED**: Create `src/modules/analytics/presentation/__tests__/revenue-chart.test.tsx` — renders AreaChart with data, empty state (ANP-004)
- [ ] 6.2 **GREEN**: Create `src/modules/analytics/presentation/revenue-chart.tsx` — dynamic import Recharts AreaChart, ResponsiveContainer
- [ ] 6.3 **RED**: Create `src/modules/analytics/presentation/__tests__/bookings-chart.test.tsx` — renders PieChart with segments (ANP-005)
- [ ] 6.4 **GREEN**: Create `src/modules/analytics/presentation/bookings-chart.tsx` — dynamic import Recharts PieChart
- [ ] 6.5 **RED**: Create `src/modules/analytics/presentation/__tests__/occupancy-chart.test.tsx` — renders BarChart with percentage (ANP-006)
- [ ] 6.6 **GREEN**: Create `src/modules/analytics/presentation/occupancy-chart.tsx` — dynamic import Recharts BarChart

## Phase 7: Presentation Lists & Temporal — Track 4 continued (PR #7)

- [ ] 7.1 **RED**: Create `src/modules/analytics/presentation/__tests__/temporal-charts.test.tsx` — peak hours + day-of-week charts (ANP-007 partial)
- [ ] 7.2 **GREEN**: Create `src/modules/analytics/presentation/temporal-charts.tsx` — two BarCharts: peak hours + day distribution
- [ ] 7.3 **RED**: Create `src/modules/analytics/presentation/__tests__/top-services.test.tsx` — ranked list, empty (ANP-007)
- [ ] 7.4 **GREEN**: Create `src/modules/analytics/presentation/top-services.tsx` — ranked service list component
- [ ] 7.5 **RED**: Create `src/modules/analytics/presentation/__tests__/top-professionals.test.tsx` — ranked list + filter visibility per role (ANP-007, ANP-008)
- [ ] 7.6 **GREEN**: Create `src/modules/analytics/presentation/top-professionals.tsx` — ranked professional list + filter dropdown

## Phase 8: Integration — Track 5 (PR #8)

- [ ] 8.1 Create `src/app/(dashboard)/dashboard/analytics/page.tsx` — route entry: Header + single `<Suspense fallback={<AnalyticsSkeleton />}>` wrapping `<AnalyticsPage />` (ANP-001, ANP-011)
- [ ] 8.2 Create `src/modules/analytics/index.ts` — module barrel
- [ ] 8.3 **REFACTOR**: Run `pnpm vitest run` — all tests green, `pnpm type-check` passes, `pnpm lint` passes
