/**
 * Analytics actions — barrel exports.
 *
 * Re-exports the Server Action and shared types so consumers
 * can import from `@/modules/analytics/actions`.
 */

export { getAnalyticsAction } from "./analytics-actions";
export type {
  AnalyticsError,
  AnalyticsQueryInput,
  AnalyticsResult,
  AnalyticsSuccess,
} from "./analytics-actions.types";
