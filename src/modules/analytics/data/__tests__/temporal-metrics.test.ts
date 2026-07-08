/**
 * Tests for getPeakHours and getDayDistribution — temporal aggregation.
 *
 * These functions use findMany + pure helpers because Prisma groupBy
 * does not support computed fields (hour, dayOfWeek).
 *
 * Spec: AND-003 (temporal aggregation), AND-005 (empty handling).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  booking: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getPeakHours, getDayDistribution } = await import("../analytics-data");

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-07T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };

describe("getPeakHours", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array when no bookings exist", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const result = await getPeakHours(ORG_ID, RANGE);

    expect(result).toEqual([]);
  });

  it("groups bookings by hour of day", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      { startTime: new Date("2026-01-02T09:00:00Z") },
      { startTime: new Date("2026-01-02T09:30:00Z") },
      { startTime: new Date("2026-01-03T14:00:00Z") },
      { startTime: new Date("2026-01-04T09:00:00Z") },
    ]);

    const result = await getPeakHours(ORG_ID, RANGE);

    expect(result).toHaveLength(2);
    // Sorted by count descending
    expect(result[0]?.hour).toBe(9);
    expect(result[0]?.count).toBe(3);
    expect(result[1]?.hour).toBe(14);
    expect(result[1]?.count).toBe(1);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    await getPeakHours(ORG_ID, RANGE, "prof-404");

    const call = prismaMock.booking.findMany.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-404");
  });
});

describe("getDayDistribution", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array when no bookings exist", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const result = await getDayDistribution(ORG_ID, RANGE);

    expect(result).toEqual([]);
  });

  it("groups bookings by day of week (0=Sunday)", async () => {
    // Jan 5 2026 = Monday (1), Jan 6 = Tuesday (2), Jan 7 = Wednesday (3)
    prismaMock.booking.findMany.mockResolvedValueOnce([
      { startTime: new Date("2026-01-05T10:00:00Z") }, // Monday
      { startTime: new Date("2026-01-05T14:00:00Z") }, // Monday
      { startTime: new Date("2026-01-06T09:00:00Z") }, // Tuesday
      { startTime: new Date("2026-01-07T11:00:00Z") }, // Wednesday
    ]);

    const result = await getDayDistribution(ORG_ID, RANGE);

    expect(result).toHaveLength(3);
    // Sorted by count descending
    expect(result[0]?.dayOfWeek).toBe(1); // Monday
    expect(result[0]?.count).toBe(2);
    expect(result[1]?.dayOfWeek).toBe(2); // Tuesday
    expect(result[1]?.count).toBe(1);
    expect(result[2]?.dayOfWeek).toBe(3); // Wednesday
    expect(result[2]?.count).toBe(1);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    await getDayDistribution(ORG_ID, RANGE, "prof-505");

    const call = prismaMock.booking.findMany.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-505");
  });
});
