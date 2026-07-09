/**
 * Analytics domain — public barrel.
 *
 * Re-exports all domain types, schemas, constants, and helpers. The data
 * layer uses the types for Prisma return shapes; the action layer uses
 * the schemas for input validation; the presentation layer uses the
 * helpers and constants for display.
 *
 * Consumers should import from `@/modules/analytics/domain` (or via the
 * module barrel `@/modules/analytics`).
 */

// Types — DateRange, metric interfaces, AnalyticsResponse.
export * from "./types";

// Schemas — dateRangeSchema, analyticsQuerySchema, inferred types.
export * from "./schemas";

// Constants — DATE_RANGE_PRESETS, METRIC_LABELS.
export * from "./constants";

// Helpers — getDateBoundaries, formatMetricValue.
export * from "./helpers";
