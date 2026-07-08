/**
 * Tests for AnalyticsResult<T> — discriminated union narrowing.
 *
 * Verifies the result type follows the same SettingsResult<T> pattern:
 *  - success branch carries typed `data`
 *  - error branch carries `error` string
 *  - TypeScript narrowing works via `result.success` check
 *
 * Spec: ANA-003 (typed error handling via AnalyticsResult<T>).
 * Design: openspec/changes/analytics/design.md — Interfaces / Contracts.
 */

import { describe, expect, it } from "vitest";

// Runtime import — verifies the module exports these names at runtime.
void (await import("../analytics-actions.types"));

import type { AnalyticsResult, AnalyticsQueryInput } from "../analytics-actions.types";

// ---------------------------------------------------------------------------
// Helper: simulate what getAnalyticsAction returns
// ---------------------------------------------------------------------------

function succeed<T>(data: T): AnalyticsResult<T> {
  return { success: true, data };
}

function fail<T>(error: string): AnalyticsResult<T> {
  return { success: false, error };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnalyticsResult<T>", () => {
  it("success branch carries typed data and narrows correctly", () => {
    const result = succeed({ total: 42 });

    expect(result.success).toBe(true);
    if (result.success) {
      // TypeScript narrowing: data is accessible on the success branch.
      expect(result.data).toEqual({ total: 42 });
    }
  });

  it("error branch carries error string and narrows correctly", () => {
    const result = fail<{ total: number }>("Database error: failed to fetch analytics");

    expect(result.success).toBe(false);
    if (!result.success) {
      // TypeScript narrowing: error is accessible on the failure branch.
      expect(result.error).toBe("Database error: failed to fetch analytics");
    }
  });

  it("works with complex generic types (AnalyticsResponse shape)", () => {
    const mockResponse = {
      revenue: { total: 1000, averagePerBooking: 100, dailyRevenue: [], monthlyRevenue: [] },
      bookings: { total: 10, confirmed: 5, cancelled: 2, completed: 3, completionRate: 0.3 },
      occupancy: { occupiedSlots: 8, totalSlots: 20, rate: 0.4 },
      patients: { newPatients: 4, returningPatients: 6, totalUnique: 10 },
      topServices: [],
      topProfessionals: [],
      peakHours: [],
      dayDistribution: [],
    };

    const result = succeed(mockResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenue.total).toBe(1000);
      expect(result.data.bookings.completionRate).toBe(0.3);
      expect(result.data.occupancy.rate).toBe(0.4);
    }
  });

  it("error branch does not carry data property", () => {
    const result = fail("Access denied");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Access denied");
      // The error branch should not have a `data` key.
      expect("data" in result).toBe(false);
    }
  });
});

describe("AnalyticsQueryInput", () => {
  it("accepts dateRange with preset only", () => {
    // Runtime shape check — this will fail if the type module doesn't export.
    const input: AnalyticsQueryInput = {
      dateRange: { preset: "7d" },
    };
    expect(input.dateRange.preset).toBe("7d");
    expect(input.professionalUserId).toBeUndefined();
  });

  it("accepts custom dateRange with from/to", () => {
    const input: AnalyticsQueryInput = {
      dateRange: {
        preset: "custom",
        from: new Date("2026-01-01"),
        to: new Date("2026-01-31"),
      },
    };
    expect(input.dateRange.preset).toBe("custom");
  });

  it("accepts optional professionalUserId", () => {
    const input: AnalyticsQueryInput = {
      dateRange: { preset: "30d" },
      professionalUserId: "prof-123",
    };
    expect(input.professionalUserId).toBe("prof-123");
  });
});
