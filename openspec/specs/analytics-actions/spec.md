# Analytics Actions Specification

## Purpose
Server Actions for analytics data fetching with RBAC scoping, Zod 4 input validation, and typed error handling. Follows project convention: `"use server"`, `Promise<ActionResult<T>>`.

## Requirements

### Requirement: getAnalyticsAction (ANA-001)
The system MUST export `getAnalyticsAction(input: AnalyticsQueryInput): Promise<AnalyticsResult<AnalyticsResponse>>`. It SHALL validate input via Zod, resolve the current session, and return all metrics in a single typed response. The action MUST call domain aggregation functions for each metric type.

#### Scenario: Admin fetches full analytics
- GIVEN ADMIN session, valid 7d range → WHEN `getAnalyticsAction({ dateRange: { preset: "7d" } })` → THEN returns all 8 metric types (incl. peakHours, dayDistribution) with org-wide data

#### Scenario: Invalid date range rejected
- GIVEN `{ dateRange: { preset: "custom" } }` without from/to → THEN returns `{ success: false, error: "Invalid date range: from and to required" }`

### Requirement: Role Resolution (ANA-002)
The system MUST resolve the current user's role from the session. ADMIN and SECRETARY SHALL receive full organization data. PROFESSIONAL SHALL have `professionalUserId` injected into all query filters automatically. If `professionalUserId` is passed for PROFESSIONAL role, it SHALL be ignored (defense in depth).

#### Scenario: PROFESSIONAL auto-scoped
- GIVEN PROFESSIONAL user "prof-123" → WHEN `getAnalyticsAction({ dateRange: { preset: "30d" } })` → THEN all queries filtered with `professionalUserId: "prof-123"`

#### Scenario: ADMIN sees all data
- GIVEN ADMIN user → WHEN `getAnalyticsAction({ dateRange: { preset: "30d" } })` → THEN no professionalUserId filter applied (org-wide)

#### Scenario: SECRETARY sees all data
- GIVEN SECRETARY user → WHEN `getAnalyticsAction({ dateRange: { preset: "30d" } })` → THEN no professionalUserId filter applied

### Requirement: Error Handling (ANA-003)
The system MUST return typed errors via `AnalyticsResult<T>` (discriminated union: `{ success: true, data: T } | { success: false, error }`), matching the project's `SettingsResult<T>` pattern. Zod validation errors SHALL return field-specific messages. Prisma errors SHALL be caught and returned as "Database error: ..." — never expose stack traces.

#### Scenario: Prisma connection error
- GIVEN Prisma query throws → THEN returns `{ success: false, error: "Database error: failed to fetch analytics" }`

#### Scenario: Session resolution failure
- GIVEN no auth cookie → THEN returns `{ success: false, error: "Unauthorized" }`

### Requirement: PATIENT Blocked (ANA-004)
The system MUST block PATIENT role at the action level. If the resolved session has role=PATIENT, the action SHALL return `{ success: false, error: "Access denied" }` before executing any database queries.

#### Scenario: Patient blocked before queries
- GIVEN PATIENT session → WHEN calling action → THEN blocked immediately, no DB queries executed

#### Scenario: Blocked even with valid input
- GIVEN PATIENT session with valid date range → THEN still returns "Access denied"
