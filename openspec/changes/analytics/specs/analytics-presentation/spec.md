# Analytics Presentation Specification

## Purpose
Analytics page at `/dashboard/analytics`: KPI cards, charts (Recharts), date-range filter, professional filter, and full state coverage (loading/empty/error). RBAC-aware rendering.

## Requirements

### Requirement: Analytics Page (ANP-001)
The system MUST render a Server Component at `/dashboard/analytics` streaming each chart section via `<Suspense>` with skeleton fallbacks. The page SHALL call `getAnalyticsAction` at the server level.

#### Scenario: Admin visits analytics
- GIVEN authenticated ADMIN → WHEN `/dashboard/analytics` → THEN page streams: loading skeleton → KPI cards → Revenue chart → Bookings chart → Occupancy → Top lists

#### Scenario: Professional visits analytics
- GIVEN PROFESSIONAL session → THEN page renders with auto-scoped data, no professional filter dropdown visible

### Requirement: DateRangeFilter (ANP-002)
The system SHALL render a Client Component with preset buttons (`7d`, `30d`, `3mo`, `6mo`) and custom date inputs (from/to date pickers). Selecting a preset MUST trigger server re-fetch. Custom range SHALL show date inputs and validate `from < to`.

#### Scenario: Preset click triggers reload
- GIVEN "30d" selected → WHEN user clicks "7d" → THEN data refetches, KPIs update

#### Scenario: Custom range with valid dates
- GIVEN user selects from="2026-01-01", to="2026-01-31" → THEN data fetches for that range

### Requirement: KPI Cards (ANP-003)
The system MUST render 4 KPI cards: **Revenue**, **Bookings**, **Occupancy**, **Patients**. Each card SHALL show the metric value with a label and optional trend indicator.

#### Scenario: Revenue card shows formatted amount
- GIVEN totalRevenue=150000 → THEN card displays "$150,000.00"

#### Scenario: Occupancy card with percentage
- GIVEN rate=0.75 → THEN card displays "75%"

### Requirement: Revenue Over Time Chart (ANP-004)
The system SHALL render a Recharts `<AreaChart>` with daily revenue data from `RevenueMetric.dailyRevenue`. Chart MUST have responsive container, axis labels, and tooltips.

#### Scenario: Revenue chart with data
- GIVEN `dailyRevenue` has 7 entries → THEN AreaChart renders with 7 data points

#### Scenario: Revenue chart empty
- GIVEN `dailyRevenue=[]` → THEN chart area shows "No revenue data for this period"

### Requirement: Bookings by Status Chart (ANP-005)
The system SHALL render a Recharts `<PieChart>` or `<BarChart>` showing confirmed/cancelled/completed counts. Segment colors MUST be distinguishable.

#### Scenario: Booking status distribution
- GIVEN confirmed=10, cancelled=2, completed=8 → THEN chart shows 3 segments with correct proportions

### Requirement: Occupancy Visualization (ANP-006)
The system SHALL render an occupancy chart (bar chart or heatmap) from `OccupancyMetric`. The visualization MUST show rate as percentage per period.

#### Scenario: Occupancy with partial slots
- GIVEN occupiedSlots=12, totalSlots=40 → THEN bar shows 30% fill

### Requirement: Top Lists (ANP-007)
The system SHALL render "Top Services" and "Top Professionals" as ranked lists (ordered by count/revenue descending). Each list item SHALL show name, count, and revenue.

#### Scenario: Top services ranked
- GIVEN 3 services with counts [15, 8, 3] → THEN list ordered: first has 15 bookings

### Requirement: Professional Filter (ANP-008)
The system SHALL render a professional dropdown filter for ADMIN/SECRETARY roles. PROFESSIONAL role MUST NOT see the filter (auto-scoped). Changing the filter MUST trigger full data refetch.

#### Scenario: Admin sees filter
- GIVEN ADMIN role → THEN professional filter dropdown is visible

#### Scenario: Professional filter hidden
- GIVEN PROFESSIONAL role → THEN professional filter is NOT rendered

### Requirement: Empty State (ANP-009)
When all metrics are zero/empty for the selected range, the page SHALL display an empty-state illustration with message "No data available for this period."

#### Scenario: No bookings, no revenue
- GIVEN all metrics return zero/empty → THEN empty state shown, no charts rendered

### Requirement: Error State (ANP-010)
When the Server Action fails, the page SHALL render an error boundary with message "Failed to load analytics. Please try again." and a retry button.

#### Scenario: Server Action throws
- GIVEN `getAnalyticsAction` throws → THEN error boundary catches, renders error message, retry button calls action again

### Requirement: RBAC Gate (ANP-011)
PATIENT role MUST be redirected to `/dashboard` with toast "Access denied". Unauthenticated users MUST redirect to `/login`.

#### Scenario: Patient blocked
- GIVEN PATIENT session → THEN redirect to `/dashboard`, no analytics data exposed

#### Scenario: Unauthenticated blocked
- GIVEN no session → THEN redirect to `/login`
