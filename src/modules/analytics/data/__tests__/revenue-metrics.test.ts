/**
 * Tests for getRevenueMetrics — revenue aggregation from Payment model.
 *
 * Mocks Prisma to verify: empty results return zeroed objects,
 * approved payments are summed correctly, null amounts are handled,
 * and professionalUserId filters correctly.
 *
 * Spec: AND-003 (revenue aggregation), AND-005 (empty/null handling).
 * Design: openspec/changes/analytics/design.md — Data Flow.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider.
// ---------------------------------------------------------------------------

const prismaMock = {
  payment: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getRevenueMetrics } = await import("../analytics-data");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-31T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };

// ---------------------------------------------------------------------------
// getRevenueMetrics
// ---------------------------------------------------------------------------

describe("getRevenueMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns zeroed revenue metric when no approved payments exist", async () => {
    prismaMock.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
      _count: { _all: 0 },
    });
    prismaMock.payment.findMany.mockResolvedValueOnce([]);

    const result = await getRevenueMetrics(ORG_ID, RANGE);

    expect(result.total).toBe(0);
    expect(result.averagePerBooking).toBe(0);
    expect(result.dailyRevenue).toEqual([]);
    expect(result.monthlyRevenue).toEqual([]);
  });

  it("returns correct revenue from approved payments", async () => {
    prismaMock.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: 15000 },
      _count: { _all: 10 },
    });
    prismaMock.payment.findMany.mockResolvedValueOnce([
      { amount: 5000, booking: { startTime: new Date("2026-01-15T10:00:00Z") } },
      { amount: 10000, booking: { startTime: new Date("2026-01-20T14:00:00Z") } },
    ]);

    const result = await getRevenueMetrics(ORG_ID, RANGE);

    expect(result.total).toBe(15000);
    expect(result.averagePerBooking).toBe(1500);
    expect(result.dailyRevenue).toHaveLength(2);
    expect(result.dailyRevenue[0]?.date).toBe("2026-01-15");
    expect(result.dailyRevenue[0]?.amount).toBe(5000);
    expect(result.dailyRevenue[1]?.date).toBe("2026-01-20");
    expect(result.dailyRevenue[1]?.amount).toBe(10000);
    expect(result.monthlyRevenue).toHaveLength(1);
    expect(result.monthlyRevenue[0]?.month).toBe("2026-01");
    expect(result.monthlyRevenue[0]?.amount).toBe(15000);
  });

  it("treats null _sum.amount as 0 (AND-005 null handling)", async () => {
    prismaMock.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
      _count: { _all: 3 },
    });
    prismaMock.payment.findMany.mockResolvedValueOnce([
      { amount: 0, booking: { startTime: new Date("2026-01-10T09:00:00Z") } },
    ]);

    const result = await getRevenueMetrics(ORG_ID, RANGE);

    expect(result.total).toBe(0);
    expect(result.averagePerBooking).toBe(0);
    expect(result.dailyRevenue[0]?.amount).toBe(0);
    expect(result.monthlyRevenue[0]?.amount).toBe(0);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: 5000 },
      _count: { _all: 5 },
    });
    prismaMock.payment.findMany.mockResolvedValueOnce([]);

    await getRevenueMetrics(ORG_ID, RANGE, "prof-123");

    const aggregateCall = prismaMock.payment.aggregate.mock.calls[0]?.[0];
    expect(aggregateCall.where.booking.professionalId).toBe("prof-123");
  });
});
