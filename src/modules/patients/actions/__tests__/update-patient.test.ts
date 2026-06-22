/**
 * Tests for the `updatePatient` Server Action.
 *
 * Mirrors the `createPatient` test strategy with one extra boundary:
 * the action also calls `getPatientById` to verify the patient exists
 * (and to scope to the org) before delegating to the data layer.
 *
 * Mocked boundaries:
 *   1. `@/lib/prisma`                       — `prisma.patient.update` for status change
 *   2. `next/headers`                       — `headers()` for session lookup
 *   3. `@/core/auth`                        — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`       — `getOrganizationId()`
 *   5. `next/cache`                         — `revalidatePath()`
 *   6. `@/modules/patients/data/...`        — `getPatientById`, `updatePatient`
 *   7. `@/modules/patients/domain/patient`  — (only `patientMatches`; partial mock)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PATIENT_ID = "00000000-0000-4000-8000-0000000000c1";

const prismaMock = vi.hoisted(() => ({
  patient: {
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

const getPatientByIdMock = vi.fn();
const updatePatientDataMock = vi.fn();
vi.mock("@/modules/patients/data/patient-data", () => ({
  getPatientById: getPatientByIdMock,
  updatePatient: updatePatientDataMock,
}));

// Partial mock of domain/patient — we don't need dedup here.
vi.mock("@/modules/patients/domain/patient", async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

// Import after mocks are in place.
const { updatePatient } = await import("../update-patient.action");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return { user: { id: ADMIN_USER_ID, role } };
}

const existingPatient = {
  id: PATIENT_ID,
  organizationId: ORG_ID,
  fullName: "Juan Pérez",
  email: "juan@example.com",
  phone: "+54 11 5555-1234",
  documentId: "40123456",
  status: "ACTIVE" as const,
  notes: "Test patient",
  createdByUserId: ADMIN_USER_ID,
  createdByUserName: "Admin User",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const validUpdate = {
  id: PATIENT_ID,
  fullName: "Juan Pérez Editado",
  email: "juan.new@example.com",
  phone: "+54 11 5555-9999",
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("updatePatient action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks after resetAllMocks.
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("updates the patient and returns success when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);
    updatePatientDataMock.mockResolvedValueOnce({
      ...existingPatient,
      ...validUpdate,
    });

    const result = await updatePatient(validUpdate);

    expect(result.success).toBe(true);
  });

  it("calls revalidatePath('/dashboard/patients') after a successful update", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);
    updatePatientDataMock.mockResolvedValueOnce({
      ...existingPatient,
      ...validUpdate,
    });

    await updatePatient(validUpdate);

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/patients");
  });

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  it("returns 'Paciente no encontrado' when getPatientById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(null);

    const result = await updatePatient(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Paciente no encontrado");
    }
    expect(updatePatientDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Wrong org — getPatientById is org-scoped, returns null
  // -------------------------------------------------------------------------

  it("returns 'Paciente no encontrado' when patient belongs to a different org", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // Simulate: action calls getPatientById(ORG_ID, id) → null because patient
    // is in OTHER_ORG_ID.
    getPatientByIdMock.mockResolvedValueOnce(null);

    const result = await updatePatient(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Paciente no encontrado");
    }
    expect(updatePatientDataMock).not.toHaveBeenCalled();
    // And the action must have queried with the right org.
    expect(getPatientByIdMock).toHaveBeenCalledWith(ORG_ID, PATIENT_ID);
  });

  // -------------------------------------------------------------------------
  // Bad UUID — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects when id is not a valid UUID", async () => {
    // No session mock needed: Zod parse fails first.
    const result = await updatePatient({
      id: "not-a-uuid",
      fullName: "X",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("paciente");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(getPatientByIdMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // P2002 — duplicate email on User.update
  // -------------------------------------------------------------------------

  it("returns 'Ya existe un paciente con ese email' when updatePatient throws P2002", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);

    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      { code: "P2002", clientVersion: "test" },
    );
    updatePatientDataMock.mockRejectedValueOnce(p2002);

    const result = await updatePatient({
      id: PATIENT_ID,
      email: "taken@example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ya existe un paciente con ese email");
    }
  });

  // -------------------------------------------------------------------------
  // P2025 — record not found inside the update transaction
  // -------------------------------------------------------------------------

  it("returns 'Paciente no encontrado' when updatePatient throws P2025", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);

    const p2025 = new Prisma.PrismaClientKnownRequestError(
      "Record to update not found",
      { code: "P2025", clientVersion: "test" },
    );
    updatePatientDataMock.mockRejectedValueOnce(p2025);

    const result = await updatePatient({ id: PATIENT_ID, phone: "+54 11 0" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Paciente no encontrado");
    }
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await updatePatient(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getPatientByIdMock).not.toHaveBeenCalled();
    expect(updatePatientDataMock).not.toHaveBeenCalled();
  });
});
