# Proposal: Analytics Module

## Intent

Dashboard metrics are hardcoded into `dashboard-data.ts` with fixed date ranges, in-memory grouping (`getTopServices` loads ALL bookings), no RBAC scoping, and no dedicated analytics route. Professionals cannot see their own performance data. We need a dedicated analytics module with date-range filtering, role-based scoping, and database-level aggregation.

## Scope

### In Scope
- **Module**: `src/modules/analytics/` (domain / data / actions / presentation)
- **Route**: `src/app/(dashboard)/dashboard/analytics/page.tsx` — Server Component with Suspense streaming
- **Date-range filter**: 7d, 30d, 3mo, 6mo, custom range
- **Revenue metrics**: daily, monthly, by service, by professional
- **Booking metrics**: total, confirmed, cancelled, completed
- **Occupancy rate**: % of available slots filled
- **Top services / top professionals**: ranked lists
- **New vs recurring patients**: patient acquisition metrics
- **Peak hours / day-of-week distribution**: temporal patterns
- **Per-professional view**: filter by professional (ADMIN/SECRETARY) or auto-scoped (PROFESSIONAL)
- **Charts**: Revenue Over Time (AreaChart), Bookings by Status (PieChart), Occupancy BarChart, Service Distribution
- **RBAC**: `analytics:view` permission — ADMIN/SECRETARY full access, PROFESSIONAL own metrics only, PATIENT blocked

### Out of Scope
- Real-time / WebSocket analytics updates
- Export to PDF/CSV
- Predictive analytics or AI insights
- Custom dashboard builder / widget drag-and-drop
- Caching layer (deferred — low admin traffic)
- Refactoring existing dashboard to consume analytics module

## Capabilities

### New Capabilities
- `analytics-domain`: DateRange type, Zod schemas, metric types, Prisma aggregation queries (groupBy, _sum, _count, _avg), timezone-aware helpers
- `analytics-presentation`: Analytics page, date-range filter, KPI cards, chart components (Recharts), professional filter dropdown, loading/empty/error states
- `analytics-actions`: Server Actions for fetching analytics data with RBAC scoping (professionalUserId injection for PROFESSIONAL role)

### Modified Capabilities
- `auth-core`: Add `analytics:view` to ADMIN, SECRETARY, and PROFESSIONAL permission lists in `ROLE_PERMISSIONS`

## Approach

**Data layer** — Pure Prisma aggregation (`groupBy`, `_sum`, `_count`, `_avg`). Never load full datasets into memory. All queries accept `DateRange` and `organizationId`. Timezone conversion via `OrganizationSettings.timezone`.

**RBAC scoping** — Actions resolve current user's role. PROFESSIONAL gets `professionalUserId` injected into query filters. ADMIN/SECRETARY see all data with optional professional filter.

**Module pattern** — Follow `src/modules/settings/` structure: `domain/` (types, schemas, constants) → `data/` (repository functions) → `actions/` (server actions with auth) → `presentation/` (page, components, charts).

**UI** — Server Component page with `<Suspense>` streaming per chart section. Client components only for date-range picker and professional filter (interactive). Recharts for all visualizations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/analytics/` | New | Full module (domain/data/actions/presentation) |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | New | Analytics page route |
| `src/modules/auth/domain/roles.ts` | Modified | Add `analytics:view` permission |
| `src/components/dashboard/sidebar.tsx` | Modified | Add Analytics nav item |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Slow aggregation on large datasets | Medium | Prisma `groupBy` with indexed columns; monitor query times |
| Timezone mismatches in date ranges | Medium | Centralize timezone conversion in domain helpers |
| PROFESSIONAL sees wrong scope | Low | Unit tests for every action with mocked role resolution |

## Rollback Plan

Remove analytics route, nav item, and permissions. Module is greenfield — no existing data or behavior at risk. Dashboard remains untouched.

## Dependencies

- `auth` module for RBAC and session
- `settings` module for `OrganizationSettings.timezone`
- `bookings` and `payments` Prisma models as data sources
- Recharts (already installed for dashboard)
- Prisma migration not required (uses existing models)

## Success Criteria

- [ ] ADMIN/SECRETARY see full analytics with all professionals
- [ ] PROFESSIONAL sees only their own metrics
- [ ] PATIENT blocked from analytics route
- [ ] Date-range filter works for all presets and custom range
- [ ] All aggregation queries use Prisma `groupBy` — zero in-memory grouping
- [ ] Charts render with loading, empty, and error states
- [ ] Domain logic, data functions, and presentation covered by unit tests (TDD)
