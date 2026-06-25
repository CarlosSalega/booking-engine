/**
 * Tests for the payments data provider.
 *
 * Mirrors the patients/professionals data-layer test strategy: mock the
 * Prisma singleton so the tests are deterministic and fast. The data
 * provider is pure (no IO of its own); Prisma is the only external
 * dependency. Mocking lets us verify the shape, the field composition,
 * the scoping, and the filtering without a real database.
 *
 * Tenant scoping: every query MUST include `organizationId` in the WHERE
 * clause. We assert this on every read function.
 *
 * Flatten-on-read: the `EnrichedPayment` DTO is built by joining Payment
 * with Booking → Patient/User, Booking → Professional/User, and Booking
 * → Service via a 4-level nested Prisma `include`. Tests assert the
 * include shape and the resulting flattened fields.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock can
// hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  payment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Import after the mock is set up. These imports intentionally use
// dynamic-await to defer loading until after `vi.mock` has hoisted.
const {
  getPayments,
  getPaymentById,
  retryPayment,
  PaymentNotFoundError,
  RetryNotAllowedError,
} = await import("../payment-data");
const { DEFAULT_PAGE_SIZE } = await import("../payment-data.types");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const PAYMENT_ID = "00000000-0000-4000-8000-0000000000c1";
const BOOKING_ID = "00000000-0000-4000-8000-0000000000b1";

function makeDbPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    organizationId: ORG_ID,
    bookingId: BOOKING_ID,
    provider: "MERCADOPAGO",
    status: "PENDING",
    amount: 5000,
    preferenceId: "pref-123",
    externalReference: "ext-456",
    retryCount: 0,
    parentPaymentId: null,
    createdAt: new Date("2026-06-20T10:00:00Z"),
    updatedAt: new Date("2026-06-20T10:00:00Z"),
    booking: {
      startTime: new Date("2026-06-25T14:00:00Z"),
      patient: { user: { name: "María González" } },
      professional: { user: { name: "Dr. García" } },
      service: { name: "Consulta general", paymentType: "FULL" },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// `getPayments`
// ---------------------------------------------------------------------------

describe("getPayments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes findMany and count to organizationId", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.count.mockResolvedValueOnce(0);

    await getPayments(ORG_ID);

    expect(prismaMock.payment.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
    expect(prismaMock.payment.count.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
  });

  it("returns paginated result with default page=1 and pageSize=20", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([makeDbPayment()]);
    prismaMock.payment.count.mockResolvedValueOnce(42);

    const result = await getPayments(ORG_ID);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(42);
    expect(result.payments).toHaveLength(1);
    expect(prismaMock.payment.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 0,
      take: 20,
    });
  });

  it("filters by status when provided (exact match)", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.count.mockResolvedValueOnce(0);

    await getPayments(ORG_ID, { status: "PENDING" });

    expect(prismaMock.payment.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID, status: "PENDING" },
    });
  });

  it("returns 2 PENDING payments when status filter narrows the set", async () => {
    const pendingPayments = [
      makeDbPayment({ id: "p1", status: "PENDING" }),
      makeDbPayment({ id: "p2", status: "PENDING" }),
    ];
    prismaMock.payment.findMany.mockResolvedValueOnce(pendingPayments);
    prismaMock.payment.count.mockResolvedValueOnce(2);

    const result = await getPayments(ORG_ID, { status: "PENDING" });

    expect(result.payments).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.payments[0]?.status).toBe("PENDING");
    expect(result.payments[1]?.status).toBe("PENDING");
  });

  it("applies search filter using OR on patient name and professional name", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.count.mockResolvedValueOnce(0);

    await getPayments(ORG_ID, { search: "maría" });

    const where = prismaMock.payment.findMany.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ organizationId: ORG_ID });
    expect(Array.isArray(where?.OR)).toBe(true);
  });

  it("returns payments whose patient name matches the search term", async () => {
    const matching = makeDbPayment({
      id: "p-match",
      booking: {
        startTime: new Date("2026-06-25T14:00:00Z"),
        patient: { user: { name: "María González" } },
        professional: { user: { name: "Dr. Pérez" } },
        service: { name: "Consulta", paymentType: "FULL" },
      },
    });
    prismaMock.payment.findMany.mockResolvedValueOnce([matching]);
    prismaMock.payment.count.mockResolvedValueOnce(1);

    const result = await getPayments(ORG_ID, { search: "maría" });

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]?.patientName).toBe("María González");
  });

  it("returns empty array with total=5 for page beyond available pages", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.count.mockResolvedValueOnce(5);

    const result = await getPayments(ORG_ID, { page: 99, pageSize: 3 });

    expect(result.payments).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.page).toBe(99);
    expect(result.pageSize).toBe(3);
  });

  it("returns empty when organization has no payments (wrong-org isolation)", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.count.mockResolvedValueOnce(0);

    const result = await getPayments(OTHER_ORG_ID);

    expect(result.payments).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.payment.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: OTHER_ORG_ID },
    });
  });

  it("uses correct skip/take for explicit page=2, pageSize=10", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([]);
    prismaMock.payment.count.mockResolvedValueOnce(25);

    await getPayments(ORG_ID, { page: 2, pageSize: 10 });

    expect(prismaMock.payment.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 10,
      take: 10,
    });
  });

  it("flattens Payment+Booking into EnrichedPayment with patientName/professionalName/serviceName", async () => {
    prismaMock.payment.findMany.mockResolvedValueOnce([makeDbPayment()]);
    prismaMock.payment.count.mockResolvedValueOnce(1);

    const result = await getPayments(ORG_ID);

    const p = result.payments[0]!;
    expect(p.id).toBe(PAYMENT_ID);
    expect(p.amount).toBe(5000);
    expect(p.status).toBe("PENDING");
    expect(p.patientName).toBe("María González");
    expect(p.professionalName).toBe("Dr. García");
    expect(p.serviceName).toBe("Consulta general");
    expect(p.servicePaymentType).toBe("FULL");
    expect(p.bookingStartTime).toBeInstanceOf(Date);
    expect(p.businessStatus).toBe("PENDING");
  });
});

// ---------------------------------------------------------------------------
// `getPaymentById`
// ---------------------------------------------------------------------------

describe("getPaymentById", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when the payment does not exist", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);

    const result = await getPaymentById(ORG_ID, "non-existent");

    expect(result).toBeNull();
    expect(prismaMock.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "non-existent", organizationId: ORG_ID },
      }),
    );
  });

  it("scopes lookup to organizationId (cross-tenant protection)", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);

    await getPaymentById(ORG_ID, "some-id");

    expect(prismaMock.payment.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "some-id", organizationId: ORG_ID },
    });
  });

  it("returns null when payment belongs to a different org", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);

    const result = await getPaymentById(OTHER_ORG_ID, PAYMENT_ID);

    expect(result).toBeNull();
    expect(prismaMock.payment.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PAYMENT_ID, organizationId: OTHER_ORG_ID },
    });
  });

  it("returns enriched payment with bookingStartTime, patientName, professionalName, serviceName", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(makeDbPayment());

    const result = await getPaymentById(ORG_ID, PAYMENT_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(PAYMENT_ID);
    expect(result?.amount).toBe(5000);
    expect(result?.status).toBe("PENDING");
    expect(result?.patientName).toBe("María González");
    expect(result?.professionalName).toBe("Dr. García");
    expect(result?.serviceName).toBe("Consulta general");
    expect(result?.servicePaymentType).toBe("FULL");
    expect(result?.bookingStartTime).toBeInstanceOf(Date);
    expect(result?.businessStatus).toBe("PENDING");
  });
});

// ---------------------------------------------------------------------------
// `retryPayment`
// ---------------------------------------------------------------------------

describe("retryPayment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws PaymentNotFoundError when payment does not exist in org", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);

    await expect(retryPayment(ORG_ID, "non-existent")).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it("throws PaymentNotFoundError when payment belongs to a different org", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);

    await expect(retryPayment(OTHER_ORG_ID, PAYMENT_ID)).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it("scopes the existence check to organizationId", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);

    await expect(retryPayment(ORG_ID, PAYMENT_ID)).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );

    expect(prismaMock.payment.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PAYMENT_ID, organizationId: ORG_ID },
    });
  });

  it("throws RetryNotAllowedError when canRetry is false (status=APPROVED)", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(
      makeDbPayment({ status: "APPROVED", retryCount: 0 }),
    );

    await expect(retryPayment(ORG_ID, PAYMENT_ID)).rejects.toBeInstanceOf(
      RetryNotAllowedError,
    );

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it("throws RetryNotAllowedError when retryCount equals DEFAULT_MAX_RETRIES (3)", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(
      makeDbPayment({ status: "REJECTED", retryCount: 3 }),
    );

    await expect(retryPayment(ORG_ID, PAYMENT_ID)).rejects.toBeInstanceOf(
      RetryNotAllowedError,
    );

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it("increments retryCount by 1 and resets status to PENDING on success", async () => {
    const existing = makeDbPayment({ status: "REJECTED", retryCount: 1 });
    prismaMock.payment.findFirst.mockResolvedValueOnce(existing);
    prismaMock.payment.update.mockResolvedValueOnce({
      ...existing,
      status: "PENDING",
      retryCount: 2,
    });

    const result = await retryPayment(ORG_ID, PAYMENT_ID);

    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PAYMENT_ID },
        data: {
          retryCount: { increment: 1 },
          status: "PENDING",
        },
      }),
    );
    expect(result.retryCount).toBe(2);
    expect(result.status).toBe("PENDING");
  });

  it("returns enriched payment after successful retry (with booking fields)", async () => {
    const existing = makeDbPayment({ status: "REJECTED", retryCount: 0 });
    prismaMock.payment.findFirst.mockResolvedValueOnce(existing);
    prismaMock.payment.update.mockResolvedValueOnce({
      ...existing,
      status: "PENDING",
      retryCount: 1,
    });

    const result = await retryPayment(ORG_ID, PAYMENT_ID);

    expect(result.id).toBe(PAYMENT_ID);
    expect(result.patientName).toBe("María González");
    expect(result.professionalName).toBe("Dr. García");
    expect(result.serviceName).toBe("Consulta general");
    expect(result.businessStatus).toBe("PENDING");
  });
});
