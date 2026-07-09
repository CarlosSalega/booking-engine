/**
 * Tests for getTopServices — service ranking by booking count.
 *
 * Spec: AND-003 (service aggregation), AND-005 (empty handling).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  booking: {
    groupBy: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
  payment: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { getTopServices } = await import("../analytics-data");

const ORG_ID = "org-001";
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-31T23:59:59Z");
const RANGE = { preset: "custom" as const, from: FROM, to: TO };

describe("getTopServices", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array when no bookings exist", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([]);

    const result = await getTopServices(ORG_ID, RANGE);

    expect(result).toEqual([]);
  });

  it("ranks services by booking count with revenue", async () => {
    // 1. booking.groupBy → serviceId groups
    prismaMock.booking.groupBy.mockResolvedValueOnce([
      { serviceId: "svc-1", _count: { _all: 15 } },
      { serviceId: "svc-2", _count: { _all: 8 } },
    ]);
    // 2. service.findMany → service details
    prismaMock.service.findMany.mockResolvedValueOnce([
      { id: "svc-1", name: "Consulta General", price: 200 },
      { id: "svc-2", name: "Limpieza Dental", price: 200 },
    ]);
    // 3. payment.findMany → revenue per service
    prismaMock.payment.findMany.mockResolvedValueOnce([
      { amount: 2000, booking: { serviceId: "svc-1" } },
      { amount: 1000, booking: { serviceId: "svc-1" } },
      { amount: 1600, booking: { serviceId: "svc-2" } },
    ]);

    const result = await getTopServices(ORG_ID, RANGE);

    expect(result).toHaveLength(2);
    expect(result[0]?.serviceId).toBe("svc-1");
    expect(result[0]?.serviceName).toBe("Consulta General");
    expect(result[0]?.count).toBe(15);
    expect(result[0]?.revenue).toBe(3000);
    expect(result[1]?.serviceId).toBe("svc-2");
    expect(result[1]?.count).toBe(8);
    expect(result[1]?.revenue).toBe(1600);
  });

  it("handles null revenue sum gracefully", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([
      { serviceId: "svc-1", _count: { _all: 5 } },
    ]);
    prismaMock.service.findMany.mockResolvedValueOnce([
      { id: "svc-1", name: "Free Service", price: 0 },
    ]);
    prismaMock.payment.findMany.mockResolvedValueOnce([]);

    const result = await getTopServices(ORG_ID, RANGE);

    expect(result[0]?.revenue).toBe(0);
  });

  it("filters by professionalUserId when provided", async () => {
    prismaMock.booking.groupBy.mockResolvedValueOnce([]);

    await getTopServices(ORG_ID, RANGE, "prof-202");

    const call = prismaMock.booking.groupBy.mock.calls[0]?.[0];
    expect(call.where.professionalId).toBe("prof-202");
  });
});
