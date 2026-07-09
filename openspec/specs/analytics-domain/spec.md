# Analytics Domain Specification

## Purpose
Analytics domain types, Zod 4 schemas, metric contracts, Prisma aggregation query contracts, and timezone-aware date helpers. Pure domain — no UI or auth.

## Requirements

### Requirement: DateRange Type and Schema (AND-001)
The system MUST export a `DateRange` type and Zod schema supporting preset enums (`7d`, `30d`, `3mo`, `6mo`, `custom`) plus optional `from`/`to` Date fields for custom ranges. When `preset !== "custom"`, `from`/`to` SHALL be computed from `now()` minus the preset duration.

| Field | Type | Req | Constraint |
|-------|------|-----|------------|
| preset | `"7d" \| "30d" \| "3mo" \| "6mo" \| "custom"` | y | `z.enum(PRESET_VALUES)` |
| from | Date | (custom) | required only when preset=custom |
| to | Date | (custom) | required only when preset=custom |

#### Scenario: Valid preset range
- GIVEN input `{ preset: "7d" }` → THEN parse succeeds, from/to computed as 7 days ago to now

#### Scenario: Custom range requires bounds
- GIVEN input `{ preset: "custom" }` without from/to → THEN fails ("from and to required for custom range")

#### Scenario: Custom range with valid bounds
- GIVEN `{ preset: "custom", from: "2026-01-01", to: "2026-01-31" }` → THEN parse succeeds

#### Scenario: From must precede to
- GIVEN `{ preset: "custom", from: "2026-01-31", to: "2026-01-01" }` → THEN fails ("from must be before to")

### Requirement: Metric Types (AND-002)
The system MUST export typed metric interfaces with flat structure:

| Metric | Key Fields |
|--------|-----------|
| `RevenueMetric` | `totalRevenue`, `averagePerBooking`, `dailyRevenue: { date: string; amount: number }[]` |
| `BookingMetric` | `total`, `confirmed`, `cancelled`, `completed`, `completionRate` |
| `OccupancyMetric` | `occupiedSlots`, `totalSlots`, `rate` (0–1) |
| `PatientMetric` | `newPatients`, `returningPatients`, `totalUnique` |
| `ServiceMetric` | `serviceId`, `serviceName`, `count`, `revenue` |
| `ProfessionalMetric` | `professionalUserId`, `professionalName`, `count`, `revenue`, `occupancyRate` |

Each metric SHALL use `number` for counts/rates and `string` for dates (ISO 8601).

#### Scenario: RevenueMetric with zero revenue
- GIVEN no payments in range → THEN `totalRevenue=0`, `averagePerBooking=0`, `dailyRevenue=[]`

#### Scenario: BookingMetric with only confirmed
- GIVEN 5 confirmed, 0 cancelled, 0 completed → THEN `completionRate=0`, `total=5`, `confirmed=5`

### Requirement: Aggregation Contracts (AND-003)
The system MUST use Prisma `groupBy` + `_sum`/`_count`/`_avg` for ALL aggregations. No function SHALL load full datasets into memory. Each aggregation query MUST accept `DateRange` and `organizationId`.

#### Scenario: Revenue by day uses groupBy
- GIVEN date range and orgId → WHEN computing daily revenue → THEN uses `prisma.payment.groupBy({ by: ["createdAt"], _sum: { amount } })`

#### Scenario: Professional filter narrows aggregation
- GIVEN `professionalUserId` param → WHEN computing booking metrics → THEN `WHERE` clause includes `professionalUserId`

### Requirement: Timezone-Aware Helpers (AND-004)
The system MUST export `getDateBoundaries(dateRange, timezone)` returning UTC boundary timestamps. Preset ranges SHALL compute `from` as start-of-day and `to` as end-of-day in the org timezone, then convert to UTC for Prisma queries.

#### Scenario: Argentina timezone preset
- GIVEN `preset="7d"`, timezone=`"America/Argentina/Buenos_Aires"` → THEN `from` = 7 days ago at 00:00 ART, `to` = today at 23:59 ART, both as UTC

### Requirement: Empty/Null Handling (AND-005)
All metric functions SHALL return zeroed metric objects when no data exists. Never return null. Empty arrays for list-type fields (`dailyRevenue`, `topServices`, etc.).

#### Scenario: No bookings in range
- GIVEN org with zero bookings for selected range → THEN all metric functions return zeroed values, empty arrays, not null

#### Scenario: Null payment amount treated as zero
- GIVEN a payment with `amount=null` → THEN aggregation treats it as 0, not NaN
