/**
 * Analytics data — public barrel.
 *
 * Re-exports all data aggregation functions. The action layer imports
 * from here to call Prisma aggregations; the presentation layer never
 * imports directly (goes through actions).
 *
 * Consumers should import from `@/modules/analytics/data` (or via the
 * module barrel `@/modules/analytics`).
 */

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
} from "./analytics-data";
