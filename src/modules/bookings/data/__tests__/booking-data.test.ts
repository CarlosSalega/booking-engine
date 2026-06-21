/**
 * Tests for the bookings data provider.
 *
 * Mirrors the dashboard-data test strategy: mock the Prisma singleton so
 * the tests are deterministic and fast. The data provider is pure (no
 * IO of its own); Prisma is the only external dependency. Mocking lets
 * us verify the shape, the field composition, the scoping, and the
 * filtering without a real database.
 *
 * RBAC scoping is asserted at the data layer: the data function must
 * add `professional: { userId }` to the WHERE clause when the caller
 * passes `professionalUserId`. The data layer never imports auth.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock can
// hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  booking: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
  patient: {
    findMany: vi.fn(),
  },
  professional: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Import after the mock is set up.
const { getBookings } = await import("../booking-data");
const { getBookingById } = await import("../booking-data");
const { getServices } = await import("../booking-data");
const { getPatients } = await import("../booking-data");
const { getProfessionalsForService } = await import("../booking-data");

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROFESSIONAL_USER_ID = "00000000-0000-4000-8000-000000000010";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-000000000011";
const SERVICE_ID = "00000000-0000-4000-8000-000000000012";
const PATIENT_ID = "00000000-0000-4000-8000-000000000013";

const sampleBooking = {
  id: "b1",
  organizationId: ORG_ID,
  patientId: PATIENT_ID,
  professionalId: PROFESSIONAL_ID,
  serviceId: SERVICE_ID,
  startTime: new Date("2026-06-19T10:00:00Z"),
  endTime: new Date("2026-06-19T10:30:00Z"),
  status: "CONFIRMED",
  paymentStatus: "PENDING",
  notes: null,
  createdAt: new Date("2026-06-18T09:00:00Z"),
  updatedAt: new Date("2026-06-18T09:00:00Z"),
  patient: {
    id: PATIENT_ID,
    user: { name: "Juan Pérez", email: "juan@example.com" },
  },
  professional: {
    id: PROFESSIONAL_ID,
    userId: PROFESSIONAL_USER_ID,
    user: { name: "Dr. García" },
  },
  service: {
    id: SERVICE_ID,
    name: "Limpieza Dental",
    price: 3500,
    durationMinutes: 45,
    paymentType: "FULL",
  },
  payments: [{ id: "p1", status: "APPROVED", amount: 3500 }],
};

describe("getBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the findMany and count queries to organizationId", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    const result = await getBookings(ORG_ID);

    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
    expect(prismaMock.booking.count.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
  });

  it("returns paginated results with default page=1 and pageSize=20", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([sampleBooking]);
    prismaMock.booking.count.mockResolvedValueOnce(42);

    const result = await getBookings(ORG_ID);

    expect(result.bookings).toHaveLength(1);
    expect(result.total).toBe(42);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 0,
      take: 20,
    });
  });

  it("respects explicit page and pageSize filters with correct skip/take", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(100);

    await getBookings(ORG_ID, { page: 3, pageSize: 10 });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 20,
      take: 10,
    });
  });

  it("applies status filter as `in` clause when statuses are provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, { status: ["CONFIRMED", "PENDING"] });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG_ID,
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    });
  });

  it("filters by professionalId and serviceId when provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, {
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
    });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG_ID,
        professionalId: PROFESSIONAL_ID,
        serviceId: SERVICE_ID,
      },
    });
  });

  it("applies dateRange filter using gte/lte on startTime", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    const dateRange = {
      start: new Date("2026-06-01T00:00:00Z"),
      end: new Date("2026-06-30T23:59:59Z"),
    };
    await getBookings(ORG_ID, { dateRange });

    const where = prismaMock.booking.findMany.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({
      organizationId: ORG_ID,
      startTime: { gte: dateRange.start, lte: dateRange.end },
    });
  });

  it("adds professional RBAC scoping when professionalUserId is provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, { professionalUserId: PROFESSIONAL_USER_ID });

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG_ID,
        professional: { userId: PROFESSIONAL_USER_ID },
      },
    });
  });

  it("searches across patient name and email when search is provided", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID, { search: "Juan" });

    const where = prismaMock.booking.findMany.mock.calls[0]?.[0]?.where;
    expect(where?.OR).toBeDefined();
    expect(Array.isArray(where?.OR)).toBe(true);
  });

  it("returns enriched booking rows with patient/professional/service/payments", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([sampleBooking]);
    prismaMock.booking.count.mockResolvedValueOnce(1);

    const result = await getBookings(ORG_ID);

    expect(result.bookings[0]?.patient?.user.name).toBe("Juan Pérez");
    expect(result.bookings[0]?.professional.user.name).toBe("Dr. García");
    expect(result.bookings[0]?.service.name).toBe("Limpieza Dental");
    expect(result.bookings[0]?.payments).toHaveLength(1);
  });

  it("orders by startTime desc (most recent first)", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([]);
    prismaMock.booking.count.mockResolvedValueOnce(0);

    await getBookings(ORG_ID);

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      orderBy: { startTime: "desc" },
    });
  });
});

describe("getBookingById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the booking does not exist", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const result = await getBookingById(ORG_ID, "non-existent");

    expect(result).toBeNull();
    expect(prismaMock.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "non-existent", organizationId: ORG_ID },
      }),
    );
  });

  it("scopes the lookup to organizationId (no cross-tenant reads)", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    await getBookingById(ORG_ID, "some-id");

    expect(prismaMock.booking.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "some-id", organizationId: ORG_ID },
    });
  });

  it("returns the enriched booking with patient/professional/service/payments", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(sampleBooking);

    const result = await getBookingById(ORG_ID, "b1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("b1");
    expect(result?.patient?.user.name).toBe("Juan Pérez");
    expect(result?.professional.user.name).toBe("Dr. García");
    expect(result?.service.name).toBe("Limpieza Dental");
    expect(result?.payments).toHaveLength(1);
  });
});

describe("getServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only ACTIVE services for the given organization", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([
      {
        id: "s1",
        name: "Limpieza",
        price: 3500,
        durationMinutes: 45,
        status: "ACTIVE",
        organizationId: ORG_ID,
      },
    ]);

    const result = await getServices(ORG_ID);

    expect(result).toHaveLength(1);
    expect(prismaMock.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, status: "ACTIVE" },
      }),
    );
  });

  it("returns an empty array when no active services exist", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);

    const result = await getServices(ORG_ID);

    expect(result).toEqual([]);
  });
});

describe("getPatients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the search to the given organization", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);

    await getPatients(ORG_ID, "Juan");

    expect(prismaMock.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_ID }),
      }),
    );
  });

  it("returns patients matching the search term by name or email", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([
      {
        id: "pt1",
        user: { name: "Juan Pérez", email: "juan@example.com" },
      },
    ]);

    const result = await getPatients(ORG_ID, "Juan");

    expect(result).toHaveLength(1);
    expect(result[0]?.user.name).toBe("Juan Pérez");
    const where = prismaMock.patient.findMany.mock.calls[0]?.[0]?.where;
    expect(where?.OR).toBeDefined();
  });

  it("returns active patients when no search is provided", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);

    await getPatients(ORG_ID);

    expect(prismaMock.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_ID, status: "ACTIVE" }),
      }),
    );
  });
});

describe("getProfessionalsForService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active professionals linked to the service", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([
      {
        id: PROFESSIONAL_ID,
        userId: PROFESSIONAL_USER_ID,
        user: { name: "Dr. García" },
        specialties: ["Odontología"],
      },
    ]);

    const result = await getProfessionalsForService(ORG_ID, SERVICE_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.user.name).toBe("Dr. García");
    expect(prismaMock.professional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_ID,
          status: "ACTIVE",
          services: { some: { id: SERVICE_ID } },
        }),
      }),
    );
  });

  it("returns an empty array when no professionals offer the service", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);

    const result = await getProfessionalsForService(ORG_ID, SERVICE_ID);

    expect(result).toEqual([]);
  });
});
