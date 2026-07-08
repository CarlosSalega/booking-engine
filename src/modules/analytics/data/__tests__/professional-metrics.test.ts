/**
 * Tests for getTopProfessionals — professional ranking by booking count.
 *
 * Spec: AND-003 (professional aggregation), AND-005 (empty handling).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  booking: {
    groupBy: vi.fn(),
  },
  professional: {
    findMany: vi.fn(),
  },
  payment: {
    groupBy: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getTopProfessionals } = await import("../analytics-data");

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-31T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };

describe("getTopProfessionals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array when no bookings exist", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([]);

    const result = await getTopProfessionals(ORG_ID, RANGE);

    expect(result).toEqual([]);
  });

  it("ranks professionals by booking count with revenue", async () => {
    // 1. booking.groupBy → professionalId groups
    prismaMock.booking.groupBy.mockResolvedValueOnce([
      { professionalId: "prof-1", _count: { _all: 20 } },
      { professionalId: "prof-2", _count: { _all: 12 } },
    ]);
    // 2. professional.findMany → user names
    prismaMock.professional.findMany.mockResolvedValueOnce([
      { id: "prof-1", user: { name: "Dr. García" } },
      { id: "prof-2", user: { name: "Dra. López" } },
    ]);
    // 3. payment.groupBy → revenue per professional
    prismaMock.payment.groupBy.mockResolvedValueOnce([
      { booking: { professionalId: "prof-1" }, _sum: { amount: 4000 } },
      { booking: { professionalId: "prof-2" }, _sum: { amount: 2400 } },
    ]);

    const result = await getTopProfessionals(ORG_ID, RANGE);

    expect(result).toHaveLength(2);
    expect(result[0]?.professionalUserId).toBe("prof-1");
    expect(result[0]?.name).toBe("Dr. García");
    expect(result[0]?.count).toBe(20);
    expect(result[0]?.revenue).toBe(4000);
    expect(result[0]?.occupancyRate).toBe(0);
    expect(result[1]?.professionalUserId).toBe("prof-2");
    expect(result[1]?.count).toBe(12);
    expect(result[1]?.revenue).toBe(2400);
  });

  it("handles null revenue sum gracefully", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([
      { professionalId: "prof-1", _count: { _all: 5 } },
    ]);
    prismaMock.professional.findMany.mockResolvedValueOnce([
      { id: "prof-1", user: { name: "Dr. Test" } },
    ]);
    prismaMock.payment.groupBy.mockResolvedValueOnce([]);

    const result = await getTopProfessionals(ORG_ID, RANGE);

    expect(result[0]?.revenue).toBe(0);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([]);

    await getTopProfessionals(ORG_ID, RANGE, "prof-303");

    const call = prismaMock.booking.groupBy.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-303");
  });
});
