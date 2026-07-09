/**
 * Analytics module — public barrel.
 *
 * Re-exports the domain types (constants, Zod schemas, inferred types),
 * the data access layer (10 Prisma aggregation functions), the Server
 * Action, and the key presentation components.
 *
 * Consumers should import from `@/modules/analytics`:
 *   - Server Components  → `AnalyticsPage`, `AnalyticsSkeleton`
 *   - Client Components  → `getAnalyticsAction` (Server Action)
 *   - Types              → `DateRange`, `AnalyticsResponse`, `AnalyticsResult`,
 *                          `AnalyticsQueryInput`, metric interfaces
 *   - Constants          → `DATE_RANGE_PRESETS`, `METRIC_LABELS`
 *   - Schemas            → `dateRangeSchema`, `analyticsQuerySchema`
 *   - Data layer         → `getRevenueMetrics`, `getBookingMetrics`, etc.
 *
 * The data layer's aggregation functions are re-exported for testing
 * and direct server-side use. Presentation components that need data
 * should go through the action layer, not the data layer directly.
 */

// Domain — types, schemas, constants, helpers.
export * from "./domain";

// Data — all 10 Prisma aggregation functions.
export {
  getRevenueMetrics,
  getDailyRevenue,
  getMonthlyRevenue,
  getBookingMetrics,
  getOccupancyMetrics,
  getPatientMetrics,
  getTopServices,
  getTopProfessionals,
  getPeakHours,
  getDayDistribution,
} from "./data";

// Server Actions + result/input types.
export {
  getAnalyticsAction,
  type AnalyticsError as AnalyticsActionError,
  type AnalyticsQueryInput as AnalyticsQueryInputAction,
  type AnalyticsResult,
  type AnalyticsSuccess,
} from "./actions";

// Presentation — page body, skeleton, and key components.
export {
  AnalyticsPage,
  AnalyticsSkeleton,
  AnalyticsEmpty,
  AnalyticsError,
  KPICards,
  DateRangeFilter,
  RevenueChartClient,
  BookingsChartClient,
  OccupancyChartClient,
  TemporalChartsClient,
  TopServices,
  TopProfessionals,
} from "./presentation";
