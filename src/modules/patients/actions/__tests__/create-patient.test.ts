/**
 * Tests for the `createPatient` Server Action.
 *
 * Mirrors the `createBooking` test strategy. The action depends on five
 * boundaries, each mocked explicitly:
 *
 *   1. `@/lib/prisma`                       — data layer (incl. $transaction)
 *   2. `next/headers`                       — `headers()` for session lookup
 *   3. `@/core/auth`                        — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`       — `getOrganizationId()`
 *   5. `next/cache`                         — `revalidatePath()`
 *   6. `@/modules/patients/data/...`        — `createPatient` (data layer)
 *   7. `@/modules/patients/domain/patient`  — `patientMatches` dedup
 *
 * The Prisma mock supports `$transaction(async (tx) => cb(tx))` by
 * passing the same `tx` mock object back to the callback.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures — declared with vi.hoisted so the mock factories can
// reference them (vi.mock is hoisted BEFORE ordinary const initializers).
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PATIENT_ID = "00000000-0000-4000-8000-0000000000c1";

// ---------------------------------------------------------------------------
// Prisma mock — BEFORE the import of the action under test.
// ---------------------------------------------------------------------------

const txMock = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
  },
  patient: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(
    async (cbOrArray: unknown) =>
      // The action uses the interactive form: $transaction(async (tx) => ...).
      // We call the callback with `txMock` so the action reads/writes through it.
      typeof cbOrArray === "function"
        ? (cbOrArray as (tx: typeof txMock) => unknown)(txMock)
        : cbOrArray,
  ),
  patient: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const getSessionMock = vi.fn();
vi.mock("@/core/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const getOrganizationIdMock = vi.fn().mockResolvedValue(ORG_ID);
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

// Mock the data layer's createPatient so the test focuses on the action's
// orchestration: Zod, auth, RBAC, dedup, P2002 mapping.
const createPatientDataMock = vi.fn();
vi.mock("@/modules/patients/data/patient-data", () => ({
  createPatient: createPatientDataMock,
}));

// Mock the domain dedup function so we can control match/no-match deterministically.
// We need to preserve `PatientStatus` (used by the schema) and `patientMatches` (mocked).
const patientMatchesMock = vi.fn();
vi.mock("@/modules/patients/domain/patient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    patientMatches: patientMatchesMock,
  };
});

// Import after mocks are in place.
const { createPatient } = await import("../create-patient.action");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return { user: { id: ADMIN_USER_ID, role } };
}

const validInput = {
  fullName: "Juan Pérez",
  email: "juan@example.com",
  phone: "+54 11 5555-1234",
  documentId: "40123456",
  status: "ACTIVE" as const,
  notes: "Test patient",
};

const createdPatient = {
  id: PATIENT_ID,
  organizationId: ORG_ID,
  fullName: "Juan Pérez",
  email: "juan@example.com",
  phone: "+54 11 5555-1234",
  documentId: "40123456",
  status: "ACTIVE",
  notes: "Test patient",
  createdByUserId: ADMIN_USER_ID,
  createdByUserName: "Admin User",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("createPatient action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks after resetAllMocks cleared them.
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("creates a patient and returns the id when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // Dedup scan inside $transaction: no matches.
    txMock.patient.findMany.mockResolvedValueOnce([]);
    patientMatchesMock.mockReturnValue(false);
    // Data layer createPatient returns the enriched patient.
    createPatientDataMock.mockResolvedValueOnce(createdPatient);

    const result = await createPatient(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(PATIENT_ID);
    }
  });

  it("calls revalidatePath('/dashboard/patients') after a successful create", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    txMock.patient.findMany.mockResolvedValueOnce([]);
    patientMatchesMock.mockReturnValue(false);
    createPatientDataMock.mockResolvedValueOnce(createdPatient);

    await createPatient(validInput);

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/patients");
  });

  // -------------------------------------------------------------------------
  // Dedup match — patientMatches returns true inside the transaction
  // -------------------------------------------------------------------------

  it("returns 'Ya existe un paciente con los mismos datos' when patientMatches returns true", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // One existing patient triggers the dedup check.
    txMock.patient.findMany.mockResolvedValueOnce([
      { id: "existing", user: { name: "Juan Pérez", email: "juan@example.com" } },
    ]);
    patientMatchesMock.mockReturnValue(true);
    createPatientDataMock.mockResolvedValueOnce(createdPatient);

    const result = await createPatient(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ya existe un paciente con los mismos datos");
    }
    // Data layer must NOT be called when dedup matches.
    expect(createPatientDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // P2002 — duplicate email
  // -------------------------------------------------------------------------

  it("returns 'Ya existe un paciente con ese email' when P2002 is thrown", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    txMock.patient.findMany.mockResolvedValueOnce([]);
    patientMatchesMock.mockReturnValue(false);
    // Simulate Prisma P2002 from the data layer.
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      { code: "P2002", clientVersion: "test" },
    );
    createPatientDataMock.mockRejectedValueOnce(p2002);

    const result = await createPatient(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ya existe un paciente con ese email");
    }
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado' and does not call data layer", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await createPatient(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createPatientDataMock).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Invalid input — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects empty fullName with a Spanish error message", async () => {
    // No session mock: Zod parse fails first.
    // @ts-expect-error testing invalid input at runtime
    const result = await createPatient({ fullName: "", status: "ACTIVE" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("nombre");
    }
    // Session / data layer must NOT be touched.
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(createPatientDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createPatient(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createPatientDataMock).not.toHaveBeenCalled();
  });
});
