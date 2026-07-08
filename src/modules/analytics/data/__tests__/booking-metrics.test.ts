/**
 * Tests for getBookingMetrics — booking status aggregation.
 *
 * Mocks Prisma groupBy to verify: empty results return zeroed metrics,
 * mixed statuses are counted correctly, and completionRate is computed.
 *
 * Spec: AND-003 (booking aggregation), AND-005 (empty handling).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const prismaMock = {
  booking: {
    groupBy: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getBookingMetrics } = await import("../analytics-data");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-31T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };

// ---------------------------------------------------------------------------
// getBookingMetrics
// ---------------------------------------------------------------------------

describe("getBookingMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns zeroed booking metric when no bookings exist", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([]);

    const result = await getBookingMetrics(ORG_ID, RANGE);

    expect(result.total).toBe(0);
    expect(result.confirmed).toBe(0);
    expect(result.cancelled).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it("counts bookings by status and computes completionRate", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([
      { status: "CONFIRMED", _count: { _all: 5 } },
      { status: "COMPLETED", _count: { _all: 3 } },
      { status: "CANCELLED", _count: { _all: 2 } },
    ]);

    const result = await getBookingMetrics(ORG_ID, RANGE);

    expect(result.total).toBe(10);
    expect(result.confirmed).toBe(5);
    expect(result.completed).toBe(3);
    expect(result.cancelled).toBe(2);
    expect(result.completionRate).toBe(0.3); // 3/10
  });

  it("handles only confirmed bookings (no completions yet)", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([
      { status: "CONFIRMED", _count: { _all: 7 } },
    ]);

    const result = await getBookingMetrics(ORG_ID, RANGE);

    expect(result.total).toBe(7);
    expect(result.confirmed).toBe(7);
    expect(result.completed).toBe(0);
    expect(result.cancelled).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([]);

    await getBookingMetrics(ORG_ID, RANGE, "prof-456");

    const call = prismaMock.booking.groupBy.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-456");
  });
});
