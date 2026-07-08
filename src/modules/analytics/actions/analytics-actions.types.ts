/**
 * Analytics Server Actions — shared types.
 *
 * Mirrors the `SettingsResult<T>` pattern from the settings module:
 *  - `AnalyticsResult<T>` — discriminated union (success / error)
 *  - `AnalyticsQueryInput` — validated input for getAnalyticsAction
 *
 * The action layer re-validates input against `analyticsQuerySchema`
 * (from the domain schemas) before executing Prisma aggregations.
 *
 * Spec: ANA-003 (typed error handling).
 * Design: openspec/changes/analytics/design.md — Interfaces / Contracts.
 */

import type { DateRange } from "../domain/types";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 */
export type AnalyticsSuccess<T> = { success: true; data: T };

/**
 * Error branch — caller narrows via `result.success === false`.
 */
export type AnalyticsError = { success: false; error: string };

/**
 * Discriminated result of the analytics Server Action.
 *
 * Use `if (result.success)` to narrow the union and access either
 * `data` (on success) or `error` (on failure).
 */
export type AnalyticsResult<T> = AnalyticsSuccess<T> | AnalyticsError;

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Input for `getAnalyticsAction`.
 *
 * `dateRange` is required — preset or custom with from/to bounds.
 * `professionalUserId` is optional — injected automatically for
 * PROFESSIONAL role, ignored if manually passed by PROFESSIONAL.
 */
export interface AnalyticsQueryInput {
  dateRange: DateRange;
  professionalUserId?: string;
}
