/**
 * Tests for the patients data provider.
 *
 * Mirrors the bookings data-layer test strategy: mock the Prisma singleton
 * so the tests are deterministic and fast. The data provider is pure (no
 * IO of its own); Prisma is the only external dependency. Mocking lets
 * us verify the shape, the field composition, the scoping, and the
 * filtering without a real database.
 *
 * Tenant scoping: every query MUST include `organizationId` in the WHERE
 * clause. We assert this on every read function.
 *
 * The `createdByUserId` audit field is a plain string column (no Prisma
 * relation) — we fetch creator names in a separate `user.findMany`
 * batch query and build a map. Tests assert both the Patient write and
 * the User lookup happen.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock can
// hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  patient: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
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
const { getPatients, getPatientById, createPatient, updatePatient, PatientNotFoundError } =
  await import("../patient-data");
const { DEFAULT_PAGE_SIZE } = await import("../patient-data.types");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PATIENT_USER_ID = "00000000-0000-4000-8000-0000000000bb";
const PATIENT_ID = "00000000-0000-4000-8000-0000000000c1";

function makeDbPatient(overrides: Record<string, unknown> = {}) {
  return {
    id: PATIENT_ID,
    organizationId: ORG_ID,
    userId: PATIENT_USER_ID,
    documentId: null,
    createdByUserId: ADMIN_USER_ID,
    status: "ACTIVE",
    phone: "+54 11 5555-1234",
    address: null,
    dateOfBirth: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    user: { name: "Juan Pérez", email: "juan@example.com" },
    ...overrides,
  };
}

function makeEmptyUsers() {
  return [] as Array<{ id: string; name: string }>;
}

function makeAdminUser() {
  return [{ id: ADMIN_USER_ID, name: "Admin Pérez" }];
}

// ---------------------------------------------------------------------------
// `getPatients`
// ---------------------------------------------------------------------------

describe("getPatients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes findMany and count to organizationId", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.count.mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    await getPatients(ORG_ID);

    expect(prismaMock.patient.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
    expect(prismaMock.patient.count.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID },
    });
  });

  it("returns paginated result with default page=1 and pageSize=20", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([makeDbPatient()]);
    prismaMock.patient.count.mockResolvedValueOnce(42);
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    const result = await getPatients(ORG_ID);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(42);
    expect(result.patients).toHaveLength(1);
    expect(prismaMock.patient.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 0,
      take: 20,
    });
  });

  it("filters by status when provided", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.count.mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    await getPatients(ORG_ID, { status: "BLOCKED" });

    expect(prismaMock.patient.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID, status: "BLOCKED" },
    });
  });

  it("returns 3 patients when status filter narrows the set", async () => {
    const blockedPatients = [
      makeDbPatient({ id: "p1", status: "BLOCKED" }),
      makeDbPatient({ id: "p2", status: "BLOCKED" }),
      makeDbPatient({ id: "p3", status: "BLOCKED" }),
    ];
    prismaMock.patient.findMany.mockResolvedValueOnce(blockedPatients);
    prismaMock.patient.count.mockResolvedValueOnce(3);
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    const result = await getPatients(ORG_ID, { status: "BLOCKED" });

    expect(result.patients).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("applies search filter using case-insensitive name/email contains", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.count.mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    await getPatients(ORG_ID, { search: "mar" });

    const where = prismaMock.patient.findMany.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ organizationId: ORG_ID });
    expect(Array.isArray(where?.OR)).toBe(true);
  });

  it("returns empty array with total=5 for page beyond available pages", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.count.mockResolvedValueOnce(5);
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    const result = await getPatients(ORG_ID, { page: 99 });

    expect(result.patients).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.page).toBe(99);
  });

  it("returns empty when organization has no patients (wrong-org isolation)", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.count.mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    const result = await getPatients(OTHER_ORG_ID);

    expect(result.patients).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.patient.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: OTHER_ORG_ID },
    });
  });

  it("uses correct skip/take for explicit page=2, pageSize=10", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([]);
    prismaMock.patient.count.mockResolvedValueOnce(25);
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    await getPatients(ORG_ID, { page: 2, pageSize: 10 });

    expect(prismaMock.patient.findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 10,
      take: 10,
    });
  });

  it("flattens Patient+User into EnrichedPatient shape with createdByUserName", async () => {
    prismaMock.patient.findMany.mockResolvedValueOnce([makeDbPatient()]);
    prismaMock.patient.count.mockResolvedValueOnce(1);
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    const result = await getPatients(ORG_ID);

    const p = result.patients[0]!;
    expect(p.id).toBe(PATIENT_ID);
    expect(p.fullName).toBe("Juan Pérez"); // mapped from user.name
    expect(p.email).toBe("juan@example.com"); // mapped from user.email
    expect(p.createdByUserId).toBe(ADMIN_USER_ID);
    expect(p.createdByUserName).toBe("Admin Pérez"); // from creator user lookup
  });
});

// ---------------------------------------------------------------------------
// `getPatientById`
// ---------------------------------------------------------------------------

describe("getPatientById", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when the patient does not exist", async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);

    const result = await getPatientById(ORG_ID, "non-existent");

    expect(result).toBeNull();
    expect(prismaMock.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "non-existent", organizationId: ORG_ID },
      }),
    );
  });

  it("scopes lookup to organizationId (cross-tenant protection)", async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);

    await getPatientById(ORG_ID, "some-id");

    expect(prismaMock.patient.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "some-id", organizationId: ORG_ID },
    });
  });

  it("returns enriched patient with fullName, email, and createdByUserName", async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(makeDbPatient());
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    const result = await getPatientById(ORG_ID, PATIENT_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(PATIENT_ID);
    expect(result?.fullName).toBe("Juan Pérez");
    expect(result?.email).toBe("juan@example.com");
    expect(result?.createdByUserName).toBe("Admin Pérez");
  });

  it("returns null when patient belongs to a different org", async () => {
    // findFirst with the wrong org returns null (no record matches)
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);

    const result = await getPatientById(OTHER_ORG_ID, PATIENT_ID);

    expect(result).toBeNull();
    expect(prismaMock.patient.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PATIENT_ID, organizationId: OTHER_ORG_ID },
    });
  });

  it("returns createdByUserName=null when creator user is missing (deleted)", async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(makeDbPatient());
    // No creator user found
    prismaMock.user.findMany.mockResolvedValueOnce(makeEmptyUsers());

    const result = await getPatientById(ORG_ID, PATIENT_ID);

    expect(result?.createdByUserName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// `createPatient`
// ---------------------------------------------------------------------------

describe("createPatient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates User then Patient inside $transaction (split write)", async () => {
    // tx object passed to the $transaction callback
    const txMock = {
      user: { create: vi.fn() },
      patient: { create: vi.fn() },
    };

    // Mock the callback execution: prisma.$transaction(async (tx) => ...)
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.user.create.mockResolvedValueOnce({
      id: PATIENT_USER_ID,
      name: "Juan Pérez",
      email: "juan@example.com",
    });
    txMock.patient.create.mockResolvedValueOnce(makeDbPatient());

    // Separate lookup for creator name (post-transaction enrichment)
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    const result = await createPatient(
      ORG_ID,
      {
        fullName: "Juan Pérez",
        email: "juan@example.com",
        status: "ACTIVE",
      },
      ADMIN_USER_ID,
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.user.create).toHaveBeenCalledTimes(1);
    expect(txMock.patient.create).toHaveBeenCalledTimes(1);

    // User.create args — name, email, role=PATIENT
    expect(txMock.user.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        name: "Juan Pérez",
        email: "juan@example.com",
        role: "PATIENT",
      },
    });

    // Patient.create args — organizationId, userId, createdByUserId
    expect(txMock.patient.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        organizationId: ORG_ID,
        userId: PATIENT_USER_ID,
        createdByUserId: ADMIN_USER_ID,
        status: "ACTIVE",
      },
    });

    expect(result.id).toBe(PATIENT_ID);
    expect(result.fullName).toBe("Juan Pérez");
    expect(result.createdByUserId).toBe(ADMIN_USER_ID);
    expect(result.createdByUserName).toBe("Admin Pérez");
  });

  it("persists createdByUserId on the Patient record (audit trail)", async () => {
    const txMock = {
      user: { create: vi.fn() },
      patient: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.user.create.mockResolvedValueOnce({
      id: PATIENT_USER_ID,
      name: "Test",
      email: "test@example.com",
    });
    txMock.patient.create.mockResolvedValueOnce(makeDbPatient());
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    await createPatient(
      ORG_ID,
      { fullName: "Test", status: "ACTIVE", email: "test@example.com" },
      ADMIN_USER_ID,
    );

    expect(txMock.patient.create.mock.calls[0]?.[0]).toMatchObject({
      data: expect.objectContaining({ createdByUserId: ADMIN_USER_ID }),
    });
  });
});

// ---------------------------------------------------------------------------
// `updatePatient`
// ---------------------------------------------------------------------------

describe("updatePatient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates User (name+email) and Patient (phone+documentId) inside $transaction", async () => {
    const txMock = {
      patient: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );

    txMock.patient.findFirst.mockResolvedValueOnce({ userId: PATIENT_USER_ID });
    txMock.user.update.mockResolvedValueOnce({});
    txMock.patient.update.mockResolvedValueOnce(
      makeDbPatient({
        phone: "+54 11 5555-0001",
        documentId: "40123456",
      }),
    );
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    const result = await updatePatient(ORG_ID, PATIENT_ID, {
      fullName: "Juan Pérez",
      email: "new@example.com",
      phone: "+54 11 5555-0001",
      documentId: "40123456",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    // Should look up the patient first to find userId
    expect(txMock.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PATIENT_ID, organizationId: ORG_ID },
      }),
    );

    // Should update User name + email
    expect(txMock.user.update).toHaveBeenCalledTimes(1);
    expect(txMock.user.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PATIENT_USER_ID },
      data: { name: "Juan Pérez", email: "new@example.com" },
    });

    // Should update Patient phone + documentId
    expect(txMock.patient.update).toHaveBeenCalledTimes(1);
    expect(txMock.patient.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: PATIENT_ID },
      data: { phone: "+54 11 5555-0001", documentId: "40123456" },
    });

    expect(result.phone).toBe("+54 11 5555-0001");
    expect(result.documentId).toBe("40123456");
  });

  it("throws PatientNotFoundError when patient does not exist in org", async () => {
    const txMock = {
      patient: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.patient.findFirst.mockResolvedValueOnce(null);

    await expect(
      updatePatient(ORG_ID, "nonexistent-id", { fullName: "Test" }),
    ).rejects.toBeInstanceOf(PatientNotFoundError);
  });

  it("throws PatientNotFoundError when patient belongs to a different org", async () => {
    const txMock = {
      patient: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    // findFirst({where: {id, organizationId: OTHER_ORG}}) returns null
    txMock.patient.findFirst.mockResolvedValueOnce(null);

    await expect(
      updatePatient(OTHER_ORG_ID, PATIENT_ID, { phone: "+54 11 0000-0000" }),
    ).rejects.toBeInstanceOf(PatientNotFoundError);
  });

  it("does not call User.update when neither fullName nor email is provided", async () => {
    const txMock = {
      patient: { findFirst: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (cb: (tx: typeof txMock) => unknown) => cb(txMock),
    );
    txMock.patient.findFirst.mockResolvedValueOnce({ userId: PATIENT_USER_ID });
    txMock.patient.update.mockResolvedValueOnce(
      makeDbPatient({ notes: "updated note" }),
    );
    prismaMock.user.findMany.mockResolvedValueOnce(makeAdminUser());

    await updatePatient(ORG_ID, PATIENT_ID, { notes: "updated note" });

    expect(txMock.user.update).not.toHaveBeenCalled();
    expect(txMock.patient.update.mock.calls[0]?.[0]).toMatchObject({
      data: { notes: "updated note" },
    });
  });
});
