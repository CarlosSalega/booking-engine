/**
 * Tests for the analytics module barrel (`src/modules/analytics/index.ts`).
 *
 * Verifies that the public API surface re-exports the expected symbols
 * from domain, data, actions, and presentation sub-modules.
 *
 * This is a structural test — the barrel has no logic, just re-exports.
 * It ensures consumers can import from `@/modules/analytics` without
 * needing to know the internal sub-module structure.
 */

import { describe, expect, it } from "vitest";

describe("analytics module barrel", () => {
  it("re-exports getAnalyticsAction from actions", async () => {
    const mod = await import("../index");
    expect(mod.getAnalyticsAction).toBeDefined();
    expect(typeof mod.getAnalyticsAction).toBe("function");
  });

  it("re-exports AnalyticsPage from presentation", async () => {
    const mod = await import("../index");
    expect(mod.AnalyticsPage).toBeDefined();
    expect(typeof mod.AnalyticsPage).toBe("function");
  });

  it("re-exports AnalyticsSkeleton from presentation", async () => {
    const mod = await import("../index");
    expect(mod.AnalyticsSkeleton).toBeDefined();
    expect(typeof mod.AnalyticsSkeleton).toBe("function");
  });

  it("re-exports domain types and schemas", async () => {
    const mod = await import("../index");
    // Schemas — runtime values
    expect(mod.dateRangeSchema).toBeDefined();
    expect(mod.analyticsQuerySchema).toBeDefined();
    // Constants
    expect(mod.DATE_RANGE_PRESETS).toBeDefined();
    expect(mod.METRIC_LABELS).toBeDefined();
    // Helpers
    expect(mod.getDateBoundaries).toBeDefined();
    expect(mod.formatMetricValue).toBeDefined();
  });

  it("re-exports data aggregation functions", async () => {
    const mod = await import("../index");
    expect(mod.getRevenueMetrics).toBeDefined();
    expect(mod.getBookingMetrics).toBeDefined();
    expect(mod.getOccupancyMetrics).toBeDefined();
    expect(mod.getPatientMetrics).toBeDefined();
    expect(mod.getTopServices).toBeDefined();
    expect(mod.getTopProfessionals).toBeDefined();
    expect(mod.getPeakHours).toBeDefined();
    expect(mod.getDayDistribution).toBeDefined();
  });
});
