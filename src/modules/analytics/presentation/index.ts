/**
 * Analytics presentation barrel — exports all presentation components.
 *
 * Components are organized by usage context:
 * - Page-level: AnalyticsPage (RSC body)
 * - UI: KPICards, DateRangeFilter
 * - States: AnalyticsSkeleton, AnalyticsEmpty, AnalyticsError
 */

export { AnalyticsPage } from "./analytics-page";
export { AnalyticsSkeleton } from "./analytics-skeleton";
export { AnalyticsEmpty } from "./analytics-empty";
export { AnalyticsError } from "./analytics-error";
export { KPICards } from "./kpi-cards";
export { DateRangeFilter } from "./date-range-filter";
