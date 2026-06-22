/**
 * Tests for the services data provider.
 *
 * Mirrors the patients data-layer test strategy: mock the Prisma singleton
 * so the tests are deterministic and fast. The data provider is pure (no
 * IO of its own); Prisma is the only external dependency. Mocking lets
 * us verify the shape, the field composition, the scoping, and the
 * filtering without a real database.
 *
 * Tenant scoping: every query MUST include `organizationId` in the WHERE
 * clause. We assert this on every read function.
 *
 * Money<->Float mapping (AD1): Prisma stores `price` and `depositAmount`
 * as raw Float. The data layer maps them to/from the domain `Money` value
 * object (`{ amount, currency: "ARS" }`). Currency is hardcoded — the
 * data layer owns the mapping in a single place.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock can
// hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  service: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Import after the mock is set up. These imports intentionally use
// dynamic-await to defer loading until after `vi.mock` has hoisted.
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  ServiceNotFoundError,
} = await import("../service-data");
const { DEFAULT_PAGE_SIZE } = await import("../service-data.types");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000a1";
const SERVICE_ID = "00000000-0000-4000-8000-0000000000b1";

function makeDbService(overrides: Record<string, unknown> = {}) {
  return {
    id: SERVICE_ID,
    organizationId: ORG_ID,
    professionalId: PROFESSIONAL_ID,
    name: "Consulta General",
    description: "Consulta de medicina general",
    durationMinutes: 30,
    price: 2000,
    depositAmount: null,
    paymentType: "NONE",
    paymentStatus: "PENDING",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    professional: {
      id: PROFESSIONAL_ID,
      user: { name: "Dr. García" },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// `getServices`
// ---------------------------------------------------------------------------

describe("getServices", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes findMany and count to organizationId", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);
    prismaMock.service.count.mockResolvedValueOnce(0);

    await getServices(ORG_ID);

    expect(prismaMock.service.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
    expect(prismaMock.service.count.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
  });

  it("returns paginated result with default page=1 and pageSize=20", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([makeDbService()]);
    prismaMock.service.count.mockResolvedValueOnce(42);

    const result = await getServices(ORG_ID);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(42);
    expect(result.services).toHaveLength(1);
    expect(prismaMock.service.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 0,
      take: 20,
    });
  });

  it("filters by status when provided", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);
    prismaMock.service.count.mockResolvedValueOnce(0);

    await getServices(ORG_ID, { status: "INACTIVE" });

    expect(prismaMock.service.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID, status: "INACTIVE" },
    });
  });

  it("returns only INACTIVE services when status=INACTIVE filter is set", async () => {
    const inactiveServices = [
      makeDbService({ id: "s1", status: "INACTIVE" }),
      makeDbService({ id: "s2", status: "INACTIVE" }),
    ];
    prismaMock.service.findMany.mockResolvedValueOnce(inactiveServices);
    prismaMock.service.count.mockResolvedValueOnce(2);

    const result = await getServices(ORG_ID, { status: "INACTIVE" });

    expect(result.services).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("applies search filter using case-insensitive name/description contains", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);
    prismaMock.service.count.mockResolvedValueOnce(0);

    await getServices(ORG_ID, { search: "consulta" });

    const where = prismaMock.service.findMany.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ organizationId: ORG_ID });
    expect(Array.isArray(where?.OR)).toBe(true);
  });

  it("returns empty array with total=5 for page beyond available pages", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);
    prismaMock.service.count.mockResolvedValueOnce(5);

    const result = await getServices(ORG_ID, { page: 99 });

    expect(result.services).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.page).toBe(99);
  });

  it("returns empty when organization has no services (wrong-org isolation)", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);
    prismaMock.service.count.mockResolvedValueOnce(0);

    const result = await getServices(OTHER_ORG_ID);

    expect(result.services).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.service.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: OTHER_ORG_ID },
    });
  });

  it("uses correct skip/take for explicit page=2, pageSize=10", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([]);
    prismaMock.service.count.mockResolvedValueOnce(25);

    await getServices(ORG_ID, { page: 2, pageSize: 10 });

    expect(prismaMock.service.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 10,
      take: 10,
    });
  });

  it("flattens Service + Professional -> User.name into EnrichedService", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([makeDbService()]);
    prismaMock.service.count.mockResolvedValueOnce(1);

    const result = await getServices(ORG_ID);

    const s = result.services[0]!;
    expect(s.id).toBe(SERVICE_ID);
    expect(s.professionalId).toBe(PROFESSIONAL_ID);
    expect(s.professionalName).toBe("Dr. García");
  });

  it("maps price Float to Money { amount, currency: 'ARS' }", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([
      makeDbService({ price: 2500 }),
    ]);
    prismaMock.service.count.mockResolvedValueOnce(1);

    const result = await getServices(ORG_ID);

    expect(result.services[0]?.price).toEqual({
      amount: 2500,
      currency: "ARS",
    });
  });

  it("maps depositAmount Float to Money { amount, currency: 'ARS' } when present", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([
      makeDbService({ depositAmount: 500, paymentType: "DEPOSIT" }),
    ]);
    prismaMock.service.count.mockResolvedValueOnce(1);

    const result = await getServices(ORG_ID);

    expect(result.services[0]?.depositAmount).toEqual({
      amount: 500,
      currency: "ARS",
    });
  });

  it("maps depositAmount null to undefined in the DTO", async () => {
    prismaMock.service.findMany.mockResolvedValueOnce([
      makeDbService({ depositAmount: null }),
    ]);
    prismaMock.service.count.mockResolvedValueOnce(1);

    const result = await getServices(ORG_ID);

    expect(result.services[0]?.depositAmount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// `getServiceById`
// ---------------------------------------------------------------------------

describe("getServiceById", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when the service does not exist", async () => {
    prismaMock.service.findFirst.mockResolvedValueOnce(null);

    const result = await getServiceById(ORG_ID, "non-existent");

    expect(result).toBeNull();
    expect(prismaMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "non-existent", organizationId: ORG_ID },
      }),
    );
  });

  it("scopes lookup to organizationId (cross-tenant protection)", async () => {
    prismaMock.service.findFirst.mockResolvedValueOnce(null);

    await getServiceById(ORG_ID, "some-id");

    expect(prismaMock.service.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "some-id", organizationId: ORG_ID },
    });
  });

  it("returns enriched service with professionalId and professionalName", async () => {
    prismaMock.service.findFirst.mockResolvedValueOnce(makeDbService());

    const result = await getServiceById(ORG_ID, SERVICE_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(SERVICE_ID);
    expect(result?.professionalId).toBe(PROFESSIONAL_ID);
    expect(result?.professionalName).toBe("Dr. García");
  });

  it("returns null when service belongs to a different org", async () => {
    prismaMock.service.findFirst.mockResolvedValueOnce(null);

    const result = await getServiceById(OTHER_ORG_ID, SERVICE_ID);

    expect(result).toBeNull();
    expect(prismaMock.service.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: SERVICE_ID, organizationId: OTHER_ORG_ID },
    });
  });
});

// ---------------------------------------------------------------------------
// `createService`
// ---------------------------------------------------------------------------

describe("createService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps Money { amount, currency } to Float on Prisma create (drops currency)", async () => {
    prismaMock.service.create.mockResolvedValueOnce(makeDbService());

    await createService(ORG_ID, {
      name: "Consulta General",
      description: "Consulta de medicina general",
      durationMinutes: 30,
      price: { amount: 2000, currency: "ARS" },
      paymentType: "NONE",
      professionalId: PROFESSIONAL_ID,
      status: "ACTIVE",
    });

    expect(prismaMock.service.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.service.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        organizationId: ORG_ID,
        name: "Consulta General",
        description: "Consulta de medicina general",
        durationMinutes: 30,
        price: 2000, // Float, NOT { amount, currency }
        paymentType: "NONE",
        professionalId: PROFESSIONAL_ID,
        status: "ACTIVE",
      },
    });

    // Sanity: currency is NOT in the Prisma payload
    const createArgs = prismaMock.service.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data).not.toHaveProperty("price.amount");
    expect(createArgs.data).not.toHaveProperty("price.currency");
  });

  it("persists depositAmount as Float when provided", async () => {
    prismaMock.service.create.mockResolvedValueOnce(
      makeDbService({ depositAmount: 500, paymentType: "DEPOSIT" }),
    );

    await createService(ORG_ID, {
      name: "Consulta con seña",
      durationMinutes: 30,
      price: { amount: 2000, currency: "ARS" },
      paymentType: "DEPOSIT",
      depositAmount: { amount: 500, currency: "ARS" },
      professionalId: PROFESSIONAL_ID,
      status: "ACTIVE",
    });

    expect(prismaMock.service.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        price: 2000,
        depositAmount: 500, // Float
        paymentType: "DEPOSIT",
      },
    });
  });

  it("returns enriched service with Money price and professionalName", async () => {
    prismaMock.service.create.mockResolvedValueOnce(makeDbService());

    const result = await createService(ORG_ID, {
      name: "Consulta General",
      durationMinutes: 30,
      price: { amount: 2000, currency: "ARS" },
      paymentType: "NONE",
      professionalId: PROFESSIONAL_ID,
      status: "ACTIVE",
    });

    expect(result.id).toBe(SERVICE_ID);
    expect(result.price).toEqual({ amount: 2000, currency: "ARS" });
    expect(result.professionalId).toBe(PROFESSIONAL_ID);
    expect(result.professionalName).toBe("Dr. García");
  });
});

// ---------------------------------------------------------------------------
// `updateService`
// ---------------------------------------------------------------------------

describe("updateService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates only the fields provided (partial update — name only)", async () => {
    const txMock = {
      service: { findFirst: vi.fn(), update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.service.findFirst.mockResolvedValueOnce({ id: SERVICE_ID });
    txMock.service.update.mockResolvedValueOnce(
      makeDbService({ name: "Nuevo Nombre" }),
    );

    await updateService(ORG_ID, SERVICE_ID, { name: "Nuevo Nombre" });

    expect(txMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SERVICE_ID, organizationId: ORG_ID },
      }),
    );

    expect(txMock.service.update).toHaveBeenCalledTimes(1);
    expect(txMock.service.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: SERVICE_ID },
      data: { name: "Nuevo Nombre" },
    });
  });

  it("maps Money price to Float when price is provided in update", async () => {
    const txMock = {
      service: { findFirst: vi.fn(), update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.service.findFirst.mockResolvedValueOnce({ id: SERVICE_ID });
    txMock.service.update.mockResolvedValueOnce(
      makeDbService({ price: 3000 }),
    );

    await updateService(ORG_ID, SERVICE_ID, {
      price: { amount: 3000, currency: "ARS" },
    });

    expect(txMock.service.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: SERVICE_ID },
      data: { price: 3000 },
    });
  });

  it("throws ServiceNotFoundError when service does not exist in org", async () => {
    const txMock = {
      service: { findFirst: vi.fn(), update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.service.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateService(ORG_ID, "nonexistent-id", { name: "Test" }),
    ).rejects.toBeInstanceOf(ServiceNotFoundError);
  });

  it("throws ServiceNotFoundError when service belongs to a different org", async () => {
    const txMock = {
      service: { findFirst: vi.fn(), update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.service.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateService(OTHER_ORG_ID, SERVICE_ID, { name: "Test" }),
    ).rejects.toBeInstanceOf(ServiceNotFoundError);
  });

  it("returns enriched service after successful update", async () => {
    const txMock = {
      service: { findFirst: vi.fn(), update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.service.findFirst.mockResolvedValueOnce({ id: SERVICE_ID });
    txMock.service.update.mockResolvedValueOnce(
      makeDbService({ name: "Renombrado" }),
    );

    const result = await updateService(ORG_ID, SERVICE_ID, {
      name: "Renombrado",
    });

    expect(result.id).toBe(SERVICE_ID);
    expect(result.name).toBe("Renombrado");
    expect(result.professionalName).toBe("Dr. García");
    expect(result.price).toEqual({ amount: 2000, currency: "ARS" });
  });
});
