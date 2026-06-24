/**
 * Tests for the dashboard data provider.
 *
 * Strategy: mock the Prisma singleton so the tests are deterministic and
 * fast. The mocked client exposes the small slice of methods that the
 * data provider uses (count, aggregate, findMany). Each test sets up
 * the return values it expects, then asserts the provider composes them
 * into the right shape.
 *
 * The data provider is pure (no IO of its own); Prisma is the only
 * external dependency. Mocking it lets us verify the shape, the field
 * composition, the sorting, and the error handling without a real
 * database.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock can
// hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  booking: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  payment: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  patient: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  professional: {
    count: vi.fn(),
  },
  service: {
    aggregate: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Import after the mock is set up.
const { getDashboardMetrics } = await import("../dashboard-data");
const { getTodayBookings } = await import("../dashboard-data");
const { getRecentActivity } = await import("../dashboard-data");
const { getTopServices } = await import("../dashboard-data");
const { getRevenueByMonth } = await import("../dashboard-data");
const { getBookingsByDay } = await import("../dashboard-data");

const ORG_ID = "00000000-0000-4000-8000-000000000001";

describe("getDashboardMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns non-negative numeric metrics and scopes queries by organizationId", async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(3) // todayBookings
      .mockResolvedValueOnce(15) // weekBookings
      .mockResolvedValueOnce(2) // cancellations
      .mockResolvedValueOnce(20); // occupiedSlots

    prismaMock.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: 42500 },
    });

    prismaMock.patient.count.mockResolvedValueOnce(4); // newPatients

    prismaMock.service.aggregate.mockResolvedValueOnce({
      _count: 8,
    });

    prismaMock.professional.count.mockResolvedValueOnce(2);

    const metrics = await getDashboardMetrics(ORG_ID);

    expect(metrics.todayBookings).toBe(3);
    expect(metrics.weekBookings).toBe(15);
    expect(metrics.monthRevenue).toBe(42500);
    expect(metrics.cancellations).toBe(2);
    expect(metrics.newPatients).toBe(4);
    expect(metrics.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(metrics.occupancyRate).toBeLessThanOrEqual(100);

    // Every Prisma call must be scoped to this organization.
    for (const call of prismaMock.booking.count.mock.calls) {
      expect(call[0]).toMatchObject({ where: { organizationId: ORG_ID } });
    }
    for (const call of prismaMock.patient.count.mock.calls) {
      expect(call[0]).toMatchObject({ where: { organizationId: ORG_ID } });
    }
    for (const call of prismaMock.professional.count.mock.calls) {
      expect(call[0]).toMatchObject({ where: { organizationId: ORG_ID } });
    }
    expect(prismaMock.payment.aggregate.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
  });

  it("returns 0 monthRevenue when payment aggregate yields null", async () => {
    prismaMock.booking.count.mockResolvedValue(0);
    prismaMock.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
    });
    prismaMock.patient.count.mockResolvedValueOnce(0);
    prismaMock.service.aggregate.mockResolvedValueOnce({ _count: 0 });
    prismaMock.professional.count.mockResolvedValueOnce(0);

    const metrics = await getDashboardMetrics(ORG_ID);

    expect(metrics.monthRevenue).toBe(0);
    expect(metrics.occupancyRate).toBe(0);
  });

  it("returns 0 occupancyRate when there are no active professionals", async () => {
    prismaMock.booking.count.mockResolvedValue(5);
    prismaMock.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 100 } });
    prismaMock.patient.count.mockResolvedValueOnce(1);
    prismaMock.service.aggregate.mockResolvedValueOnce({ _count: 3 });
    prismaMock.professional.count.mockResolvedValueOnce(0);

    const metrics = await getDashboardMetrics(ORG_ID);

    expect(metrics.occupancyRate).toBe(0);
  });
});

describe("getTodayBookings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("queries bookings with startTime between today and tomorrow and includes relations", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      {
        id: "b1",
        startTime: new Date("2026-06-20T10:00:00Z"),
        endTime: new Date("2026-06-20T10:30:00Z"),
        status: "CONFIRMED",
        patient: { user: { name: "Juan Pérez", email: "juan@example.com" } },
        professional: { user: { name: "Dr. García" } },
        service: { name: "Limpieza Dental" },
      },
    ]);

    const result = await getTodayBookings(ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.service.name).toBe("Limpieza Dental");
    expect(result[0]?.patient?.user.name).toBe("Juan Pérez");
    expect(result[0]?.professional.user.name).toBe("Dr. García");

    const callArgs = prismaMock.booking.findMany.mock.calls[0]?.[0];
    expect(callArgs).toMatchObject({
      where: { organizationId: ORG_ID },
      orderBy: { startTime: "asc" },
      take: 10,
    });
    expect(callArgs?.where?.startTime).toMatchObject({
      gte: expect.any(Date),
      lt: expect.any(Date),
    });
  });

  it("returns an empty array when no bookings exist for today", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    const result = await getTodayBookings(ORG_ID);
    expect(result).toEqual([]);
  });
});

describe("getRecentActivity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("merges bookings, payments, and patients and sorts by timestamp desc", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      {
        id: "b1",
        createdAt: new Date("2026-06-20T15:00:00Z"),
        service: { name: "Limpieza Dental" },
        patient: { user: { name: "Juan Pérez" } },
      },
    ]);
    prismaMock.payment.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        createdAt: new Date("2026-06-20T18:00:00Z"),
        status: "APPROVED",
        amount: 3500,
      },
    ]);
    prismaMock.patient.findMany.mockResolvedValueOnce([
      {
        id: "pt1",
        createdAt: new Date("2026-06-20T12:00:00Z"),
        user: { name: "María Rodríguez" },
      },
    ]);

    const result = await getRecentActivity(ORG_ID);

    expect(result).toHaveLength(3);
    // Newest first.
    expect(result[0]?.type).toBe("payment");
    expect(result[1]?.type).toBe("booking");
    expect(result[2]?.type).toBe("patient");
    // Items are clamped to 10.
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("returns an empty array when there is no activity", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.findMany.mockResolvedValueOnce([]);

    const result = await getRecentActivity(ORG_ID);

    expect(result).toEqual([]);
  });
});

describe("getTopServices", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("groups bookings by service name and returns them sorted by count desc", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      { service: { name: "Limpieza Dental" } },
      { service: { name: "Limpieza Dental" } },
      { service: { name: "Consulta General" } },
      { service: { name: "Blanqueamiento" } },
      { service: { name: "Limpieza Dental" } },
    ]);

    const result = await getTopServices(ORG_ID);

    expect(result).toHaveLength(3);
    expect(result[0]?.name).toBe("Limpieza Dental");
    expect(result[0]?.count).toBe(3);
    expect(result[1]?.count).toBe(1);
    expect(result[2]?.count).toBe(1);
  });

  it("limits the result to 5 services", async () => {
    const bookings = Array.from({ length: 10 }).map((_, i) => ({
      service: { name: `Servicio ${i}` },
    }));
    prismaMock.booking.findMany.mockResolvedValueOnce(bookings);

    const result = await getTopServices(ORG_ID);

    expect(result).toHaveLength(5);
  });
});

describe("getRevenueByMonth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 6 monthly buckets (zero-filled) and aggregates APPROVED payments", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([
      { amount: 1000, createdAt: new Date("2026-05-15T12:00:00Z") },
      { amount: 2000, createdAt: new Date("2026-05-20T12:00:00Z") },
      { amount: 500, createdAt: new Date("2026-04-10T12:00:00Z") },
    ]);

    const result = await getRevenueByMonth(ORG_ID);

    expect(result).toHaveLength(6);
    // Each entry has a "month" (YYYY-MM) and a non-negative number.
    for (const point of result) {
      expect(point.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof point.revenue).toBe("number");
      expect(point.revenue).toBeGreaterThanOrEqual(0);
    }

    // Calls aggregate with APPROVED status and a date range filter.
    const callArgs = prismaMock.payment.findMany.mock.calls[0]?.[0];
    expect(callArgs).toMatchObject({
      where: { organizationId: ORG_ID, status: "APPROVED" },
    });
  });

  it("returns all zeros when no payments exist", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    const result = await getRevenueByMonth(ORG_ID);
    expect(result).toHaveLength(6);
    for (const point of result) {
      expect(point.revenue).toBe(0);
    }
  });
});

describe("getBookingsByDay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 7 daily buckets (zero-filled) and counts bookings by created date", async () => {
    // Normalize to start of day so dateKey(toISOString) matches the
    // implementation's daysAgoStart buckets regardless of local timezone.
    const startOfDay = (d: Date) => {
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const today = startOfDay(new Date());
    const yesterday = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000));
    const twoDaysAgo = startOfDay(new Date(today.getTime() - 48 * 60 * 60 * 1000));

    prismaMock.booking.findMany.mockResolvedValueOnce([
      { createdAt: today },
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: twoDaysAgo },
    ]);

    const result = await getBookingsByDay(ORG_ID);

    expect(result).toHaveLength(7);
    for (const point of result) {
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof point.count).toBe("number");
    }

    // The total must equal the number of bookings we provided.
    const total = result.reduce((sum, p) => sum + p.count, 0);
    expect(total).toBe(4);
  });

  it("returns all zeros when no bookings exist", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    const result = await getBookingsByDay(ORG_ID);
    expect(result).toHaveLength(7);
    for (const point of result) {
      expect(point.count).toBe(0);
    }
  });
});
