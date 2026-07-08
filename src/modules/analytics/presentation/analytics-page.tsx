/**
 * `AnalyticsPage` — pure RSC body for the analytics dashboard.
 *
 * Reads searchParams for dateRange, calls `getAnalyticsAction` once,
 * and renders all children directly (no internal Suspense — the
 * single boundary lives in the route entry).
 *
 * Flow:
 *   1. Parse searchParams → DateRange (preset or custom)
 *   2. Call getAnalyticsAction({ dateRange })
 *   3. On success: render DateRangeFilter + KPICards (+ charts in later PRs)
 *   4. On empty data: render AnalyticsEmpty
 *   5. On error: render AnalyticsError
 *
 * Spec: ANP-001 (analytics page), ANP-009 (empty state), ANP-010 (error state).
 * Design: Single action returns all data — per-chart Suspense has zero
 * streaming benefit.
 */

import type { DateRange } from "../domain/types";
import { getAnalyticsAction } from "../actions/analytics-actions";
import { AnalyticsEmpty } from "./analytics-empty";
import { AnalyticsError } from "./analytics-error-wrapper";
import { BookingsChartClient, OccupancyChartClient, RevenueChartClient } from "./analytics-charts";
import { DateRangeFilter } from "./date-range-filter";
import { KPICards } from "./kpi-cards";

interface AnalyticsPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Parse searchParams into a DateRange. Defaults to `30d` if no preset.
 */
function parseDateRange(params: Record<string, string | string[] | undefined>): DateRange {
  const preset = typeof params.preset === "string" ? params.preset : "30d";

  if (preset === "custom") {
    const from = typeof params.from === "string" ? params.from : "";
    const to = typeof params.to === "string" ? params.to : "";
    if (from && to) {
      return { preset: "custom", from: new Date(from), to: new Date(to) };
    }
  }

  // Preset or fallback
  if (preset === "7d" || preset === "30d" || preset === "3mo" || preset === "6mo") {
    return { preset };
  }

  return { preset: "30d" };
}

/**
 * Check if all metrics are empty/zero — triggers the empty state.
 */
function isEmpty(data: Awaited<ReturnType<typeof getAnalyticsAction>> extends { success: true; data: infer D } ? D : never): boolean {
  return (
    data.revenue.total === 0 &&
    data.bookings.total === 0 &&
    data.occupancy.rate === 0 &&
    data.patients.totalUnique === 0 &&
    data.topServices.length === 0 &&
    data.topProfessionals.length === 0
  );
}

export async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const dateRange = parseDateRange(searchParams);
  const result = await getAnalyticsAction({ dateRange });

  // Error state
  if (!result.success) {
    return <AnalyticsError />;
  }

  const { data } = result;

  // Empty state — all metrics zero/empty
  if (isEmpty(data)) {
    return (
      <div className="space-y-6">
        <DateRangeFilter />
        <AnalyticsEmpty />
      </div>
    );
  }

  // Success state — render all children
  return (
    <div className="space-y-6">
      <DateRangeFilter />
      <KPICards data={data} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChartClient data={data.revenue} />
        <BookingsChartClient data={data.bookings} />
      </div>
      <OccupancyChartClient data={data.occupancy} />
    </div>
  );
}
