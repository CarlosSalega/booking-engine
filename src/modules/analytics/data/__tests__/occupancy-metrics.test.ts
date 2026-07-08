/**
 * Tests for getOccupancyMetrics — slot occupancy calculation.
 *
 * Occupancy = occupiedSlots / totalSlots where totalSlots is derived
 * from maxBookingsPerDay × number of days in range.
 *
 * Spec: AND-003 (occupancy aggregation), AND-005 (empty handling).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  booking: {
    count: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getOccupancyMetrics } = await import("../analytics-data");

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-08T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };
const MAX_PER_DAY = 10;

describe("getOccupancyMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns zeroed metric when no bookings exist", async () => {
    prismaMock.booking.count.mockResolvedValueOnce(0);

    const result = await getOccupancyMetrics(ORG_ID, RANGE, MAX_PER_DAY);

    expect(result.occupiedSlots).toBe(0);
    expect(result.totalSlots).toBe(80); // 8 days × 10
    expect(result.rate).toBe(0);
  });

  it("computes occupancy rate from booking count vs total slots", async () => {
    prismaMock.booking.count.mockResolvedValueOnce(40);

    const result = await getOccupancyMetrics(ORG_ID, RANGE, MAX_PER_DAY);

    expect(result.occupiedSlots).toBe(40);
    expect(result.totalSlots).toBe(80);
    expect(result.rate).toBe(0.5);
  });

  it("handles full occupancy", async () => {
    prismaMock.booking.count.mockResolvedValueOnce(80);

    const result = await getOccupancyMetrics(ORG_ID, RANGE, MAX_PER_DAY);

    expect(result.occupiedSlots).toBe(80);
    expect(result.totalSlots).toBe(80);
    expect(result.rate).toBe(1);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.count.mockResolvedValueOnce(10);

    await getOccupancyMetrics(ORG_ID, RANGE, MAX_PER_DAY, "prof-789");

    const call = prismaMock.booking.count.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-789");
  });
});
