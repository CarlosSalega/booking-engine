/**
 * Tests for the professionals data provider.
 *
 * Mirrors the services/patients data-layer test strategy: mock the
 * Prisma singleton so the tests are deterministic and fast. The data
 * provider is pure (no IO of its own); Prisma is the only external
 * dependency. Mocking lets us verify the shape, the field composition,
 * the scoping, the filtering, and the error mapping without a real
 * database.
 *
 * Tenant scoping: every query MUST include `organizationId` in the WHERE
 * clause. We assert this on every read function.
 *
 * Flatten-on-read DTO: the data layer joins Professional with User and
 * exposes `EnrichedProfessional` with `fullName`, `email`, and `image`
 * already merged from the User row.
 *
 * Split-write: `createProfessional` calls `prisma.$transaction([createUser,
 * createProfessional])` so the two rows stay consistent. `updateProfessional`
 * updates User + Professional inside the same transaction.
 *
 * P2025 (record-not-found) handling: when an update targets a row that
 * does not exist (or belongs to a different org), the data layer
 * catches the Prisma P2025 error and re-throws `ProfessionalNotFoundError`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock can
// hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  professional: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
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
  getProfessionals,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  ProfessionalNotFoundError,
} = await import("../professional-data");
const { DEFAULT_PAGE_SIZE } = await import("../professional-data.types");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000a1";
const PROFESSIONAL_USER_ID = "00000000-0000-4000-8000-0000000000b1";

function makeDbProfessional(overrides: Record<string, unknown> = {}) {
  return {
    id: PROFESSIONAL_ID,
    organizationId: ORG_ID,
    userId: PROFESSIONAL_USER_ID,
    status: "ACTIVE",
    specialties: ["Dermatología", "Cirugía"],
    license: "MN-12345",
    bio: "15 years of experience",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    user: {
      name: "Dr. García",
      email: "garcia@test.com",
      image: "https://example.com/avatar.jpg",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// `getProfessionals`
// ---------------------------------------------------------------------------

describe("getProfessionals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes findMany and count to organizationId", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);
    prismaMock.professional.count.mockResolvedValueOnce(0);

    await getProfessionals(ORG_ID);

    expect(prismaMock.professional.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
    expect(prismaMock.professional.count.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
  });

  it("returns paginated result with default page=1 and pageSize=20", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([makeDbProfessional()]);
    prismaMock.professional.count.mockResolvedValueOnce(42);

    const result = await getProfessionals(ORG_ID);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(42);
    expect(result.professionals).toHaveLength(1);
    expect(prismaMock.professional.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 0,
      take: 20,
    });
  });

  it("filters by status when provided", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);
    prismaMock.professional.count.mockResolvedValueOnce(0);

    await getProfessionals(ORG_ID, { status: "INACTIVE" });

    expect(prismaMock.professional.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID, status: "INACTIVE" },
    });
  });

  it("returns 3 INACTIVE professionals when status filter narrows the set", async () => {
    const inactive = [
      makeDbProfessional({ id: "p1", status: "INACTIVE" }),
      makeDbProfessional({ id: "p2", status: "INACTIVE" }),
      makeDbProfessional({ id: "p3", status: "INACTIVE" }),
    ];
    prismaMock.professional.findMany.mockResolvedValueOnce(inactive);
    prismaMock.professional.count.mockResolvedValueOnce(3);

    const result = await getProfessionals(ORG_ID, { status: "INACTIVE" });

    expect(result.professionals).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("applies search filter using case-insensitive name/email contains", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);
    prismaMock.professional.count.mockResolvedValueOnce(0);

    await getProfessionals(ORG_ID, { search: "gar" });

    const where = prismaMock.professional.findMany.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ organizationId: ORG_ID });
    expect(Array.isArray(where?.OR)).toBe(true);
  });

  it("returns empty array with total=5 for page beyond available pages", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);
    prismaMock.professional.count.mockResolvedValueOnce(5);

    const result = await getProfessionals(ORG_ID, { page: 99 });

    expect(result.professionals).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.page).toBe(99);
  });

  it("returns empty when organization has no professionals (wrong-org isolation)", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);
    prismaMock.professional.count.mockResolvedValueOnce(0);

    const result = await getProfessionals(OTHER_ORG_ID);

    expect(result.professionals).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.professional.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: OTHER_ORG_ID },
    });
  });

  it("uses correct skip/take for explicit page=2, pageSize=10", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([]);
    prismaMock.professional.count.mockResolvedValueOnce(25);

    await getProfessionals(ORG_ID, { page: 2, pageSize: 10 });

    expect(prismaMock.professional.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 10,
      take: 10,
    });
  });

  it("flattens Professional + User into EnrichedProfessional (fullName, email, image)", async () => {
    prismaMock.professional.findMany.mockResolvedValueOnce([makeDbProfessional()]);
    prismaMock.professional.count.mockResolvedValueOnce(1);

    const result = await getProfessionals(ORG_ID);

    const p = result.professionals[0]!;
    expect(p.id).toBe(PROFESSIONAL_ID);
    expect(p.fullName).toBe("Dr. García"); // from user.name
    expect(p.email).toBe("garcia@test.com"); // from user.email
    expect(p.image).toBe("https://example.com/avatar.jpg"); // from user.image
    expect(p.userId).toBe(PROFESSIONAL_USER_ID);
    expect(p.specialties).toEqual(["Dermatología", "Cirugía"]);
  });
});

// ---------------------------------------------------------------------------
// `getProfessionalById`
// ---------------------------------------------------------------------------

describe("getProfessionalById", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when the professional does not exist", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce(null);

    const result = await getProfessionalById(ORG_ID, "non-existent");

    expect(result).toBeNull();
    expect(prismaMock.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "non-existent", organizationId: ORG_ID },
      }),
    );
  });

  it("scopes lookup to organizationId (cross-tenant protection)", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce(null);

    await getProfessionalById(ORG_ID, "some-id");

    expect(prismaMock.professional.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "some-id", organizationId: ORG_ID },
    });
  });

  it("returns enriched professional with fullName, email, and image flattened from User", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce(makeDbProfessional());

    const result = await getProfessionalById(ORG_ID, PROFESSIONAL_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(PROFESSIONAL_ID);
    expect(result?.fullName).toBe("Dr. García");
    expect(result?.email).toBe("garcia@test.com");
    expect(result?.image).toBe("https://example.com/avatar.jpg");
    expect(result?.userId).toBe(PROFESSIONAL_USER_ID);
  });

  it("returns null when professional belongs to a different org", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce(null);

    const result = await getProfessionalById(OTHER_ORG_ID, PROFESSIONAL_ID);

    expect(result).toBeNull();
    expect(prismaMock.professional.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PROFESSIONAL_ID, organizationId: OTHER_ORG_ID },
    });
  });

  it("returns undefined `image` when User has no image", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce(
      makeDbProfessional({ user: { name: "Dr. Test", email: "t@e.com", image: null } }),
    );

    const result = await getProfessionalById(ORG_ID, PROFESSIONAL_ID);

    expect(result?.image).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// `createProfessional`
// ---------------------------------------------------------------------------

describe("createProfessional", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates User then Professional inside $transaction (split write)", async () => {
    const txMock = {
      user: { create: vi.fn() },
      professional: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.user.create.mockResolvedValueOnce({
      id: PROFESSIONAL_USER_ID,
      name: "Dr. García",
      email: "garcia@test.com",
      image: null,
    });
    txMock.professional.create.mockResolvedValueOnce(makeDbProfessional());

    const result = await createProfessional(ORG_ID, {
      fullName: "Dr. García",
      email: "garcia@test.com",
      specialties: ["Dermatología"],
      status: "ACTIVE",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.user.create).toHaveBeenCalledTimes(1);
    expect(txMock.professional.create).toHaveBeenCalledTimes(1);

    // User.create args — name, email, role=PROFESSIONAL
    expect(txMock.user.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        name: "Dr. García",
        email: "garcia@test.com",
        role: "PROFESSIONAL",
      },
    });

    // Professional.create args — organizationId, userId, specialties, status
    expect(txMock.professional.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        organizationId: ORG_ID,
        userId: PROFESSIONAL_USER_ID,
        specialties: ["Dermatología"],
        status: "ACTIVE",
      },
    });

    expect(result.id).toBe(PROFESSIONAL_ID);
    expect(result.fullName).toBe("Dr. García");
    expect(result.email).toBe("garcia@test.com");
  });

  it("passes license and bio to the Professional row when provided", async () => {
    const txMock = {
      user: { create: vi.fn() },
      professional: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.user.create.mockResolvedValueOnce({
      id: PROFESSIONAL_USER_ID,
      name: "Dr. Test",
      email: "t@e.com",
    });
    txMock.professional.create.mockResolvedValueOnce(makeDbProfessional());

    await createProfessional(ORG_ID, {
      fullName: "Dr. Test",
      email: "t@e.com",
      specialties: ["Dermatología"],
      license: "MN-99999",
      bio: "Short bio",
      status: "ACTIVE",
    });

    expect(txMock.professional.create.mock.calls[0]?.[0]).toMatchObject({
      data: expect.objectContaining({
        license: "MN-99999",
        bio: "Short bio",
      }),
    });
  });

  it("propagates Prisma P2002 (email uniqueness) from the User row", async () => {
    const txMock = {
      user: { create: vi.fn() },
      professional: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    // Simulate Prisma P2002 — data layer must NOT swallow it (action maps it).
    const p2002 = new Error("Unique constraint failed") as Error & {
      code: string;
    };
    p2002.code = "P2002";
    txMock.user.create.mockRejectedValueOnce(p2002);

    await expect(
      createProfessional(ORG_ID, {
        fullName: "Dr. Test",
        email: "dup@test.com",
        specialties: ["Dermatología"],
        status: "ACTIVE",
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

// ---------------------------------------------------------------------------
// `updateProfessional`
// ---------------------------------------------------------------------------

describe("updateProfessional", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates User (name+email) and Professional (specialties+license+bio+status) inside $transaction", async () => {
    const txMock = {
      professional: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.professional.findFirst.mockResolvedValueOnce({
      userId: PROFESSIONAL_USER_ID,
    });
    txMock.user.update.mockResolvedValueOnce({});
    txMock.professional.update.mockResolvedValueOnce(
      makeDbProfessional({
        user: { name: "Dr. García Updated", email: "new@test.com", image: null },
        specialties: ["Cirugía"],
        license: "MN-00000",
        bio: "Updated bio",
        status: "INACTIVE",
      }),
    );

    const result = await updateProfessional(ORG_ID, PROFESSIONAL_ID, {
      fullName: "Dr. García Updated",
      email: "new@test.com",
      specialties: ["Cirugía"],
      license: "MN-00000",
      bio: "Updated bio",
      status: "INACTIVE",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    // Should look up the professional first to find userId (scoped to org)
    expect(txMock.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORG_ID },
      }),
    );

    // Should update User name + email
    expect(txMock.user.update).toHaveBeenCalledTimes(1);
    expect(txMock.user.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PROFESSIONAL_USER_ID },
      data: { name: "Dr. García Updated", email: "new@test.com" },
    });

    // Should update Professional fields
    expect(txMock.professional.update).toHaveBeenCalledTimes(1);
    expect(txMock.professional.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PROFESSIONAL_ID },
      data: {
        specialties: ["Cirugía"],
        license: "MN-00000",
        bio: "Updated bio",
        status: "INACTIVE",
      },
    });

    expect(result.fullName).toBe("Dr. García Updated");
    expect(result.email).toBe("new@test.com");
    expect(result.status).toBe("INACTIVE");
  });

  it("throws ProfessionalNotFoundError when professional does not exist in org", async () => {
    const txMock = {
      professional: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.professional.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateProfessional(ORG_ID, "nonexistent-id", { fullName: "Test" }),
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);
  });

  it("throws ProfessionalNotFoundError when professional belongs to a different org", async () => {
    const txMock = {
      professional: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    // findFirst({where: {id, organizationId: OTHER_ORG}}) returns null
    txMock.professional.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateProfessional(OTHER_ORG_ID, PROFESSIONAL_ID, {
        fullName: "Test",
      }),
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);
  });

  it("does not call User.update when neither fullName nor email is provided", async () => {
    const txMock = {
      professional: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.professional.findFirst.mockResolvedValueOnce({
      userId: PROFESSIONAL_USER_ID,
    });
    txMock.professional.update.mockResolvedValueOnce(
      makeDbProfessional({ specialties: ["Cirugía"] }),
    );

    await updateProfessional(ORG_ID, PROFESSIONAL_ID, {
      specialties: ["Cirugía"],
    });

    expect(txMock.user.update).not.toHaveBeenCalled();
    expect(txMock.professional.update.mock.calls[0]?.[0]).toMatchObject({
      data: { specialties: ["Cirugía"] },
    });
  });

  it("catches Prisma P2025 from the Professional.update call and re-throws ProfessionalNotFoundError", async () => {
    const txMock = {
      professional: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    // Race condition: findFirst passes (record exists at check time), but
    // update fails with P2025 (concurrent delete). Data layer must catch.
    txMock.professional.findFirst.mockResolvedValueOnce({
      userId: PROFESSIONAL_USER_ID,
    });
    const p2025 = new Error("Record not found") as Error & { code: string };
    p2025.code = "P2025";
    txMock.professional.update.mockRejectedValueOnce(p2025);

    await expect(
      updateProfessional(ORG_ID, PROFESSIONAL_ID, {
        specialties: ["Cirugía"],
      }),
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);
  });

  it("accepts `null` to clear optional fields (license, bio)", async () => {
    const txMock = {
      professional: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.professional.findFirst.mockResolvedValueOnce({
      userId: PROFESSIONAL_USER_ID,
    });
    txMock.professional.update.mockResolvedValueOnce(
      makeDbProfessional({ license: null, bio: null }),
    );

    await updateProfessional(ORG_ID, PROFESSIONAL_ID, {
      license: null,
      bio: null,
    });

    expect(txMock.professional.update.mock.calls[0]?.[0]).toMatchObject({
      data: { license: null, bio: null },
    });
  });
});
