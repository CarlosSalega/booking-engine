/**
 * Tests for the `changePatientStatus` Server Action.
 *
 * Mirrors the `updatePatient` test strategy. The action:
 *   1. Validates `{ id, status }` with Zod 4
 *   2. Enforces RBAC (PATIENT rejected)
 *   3. Verifies the patient exists in the org via `getPatientById`
 *   4. Updates status via `prisma.patient.update`
 *   5. Revalidates `/dashboard/patients`
 *
 * Mocked boundaries:
 *   1. `@/lib/prisma`                       — `prisma.patient.update`
 *   2. `next/headers`                       — `headers()` for session lookup
 *   3. `@/core/auth`                        — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`       — `getOrganizationId()`
 *   5. `next/cache`                         — `revalidatePath()`
 *   6. `@/modules/patients/data/...`        — `getPatientById`
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/modules/patients/data/patient-data", () => ({
  getPatientById: getPatientByIdMock,
}));

// Partial mock — we don't need dedup here.
vi.mock("@/modules/patients/domain/patient", async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

// Import after mocks are in place.
const { changePatientStatus } = await import("../change-patient-status.action");

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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("changePatientStatus action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path — valid transition ACTIVE → BLOCKED
  // -------------------------------------------------------------------------

  it("updates the status and returns success for a valid transition (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);
    prismaMock.patient.update.mockResolvedValueOnce({});

    const result = await changePatientStatus({
      id: PATIENT_ID,
      status: "BLOCKED",
    });

    expect(result.success).toBe(true);
  });

  it("calls prisma.patient.update with the new status", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);
    prismaMock.patient.update.mockResolvedValueOnce({});

    await changePatientStatus({ id: PATIENT_ID, status: "BLOCKED" });

    expect(prismaMock.patient.update).toHaveBeenCalledWith({
      where: { id: PATIENT_ID },
      data: { status: "BLOCKED" },
    });
  });

  it("calls revalidatePath('/dashboard/patients') after a successful status change", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(existingPatient);
    prismaMock.patient.update.mockResolvedValueOnce({});

    await changePatientStatus({ id: PATIENT_ID, status: "BLOCKED" });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/patients");
  });

  // -------------------------------------------------------------------------
  // Bad enum — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects when status is not a valid PatientStatus", async () => {
    const result = await changePatientStatus({
      id: PATIENT_ID,
      // @ts-expect-error testing invalid input at runtime
      status: "PENDING",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod error for the enum field.
      expect(result.error.toLowerCase()).toContain("estado");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  it("returns 'Paciente no encontrado' when getPatientById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(null);

    const result = await changePatientStatus({
      id: PATIENT_ID,
      status: "BLOCKED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Paciente no encontrado");
    }
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Wrong org — getPatientById is org-scoped, returns null
  // -------------------------------------------------------------------------

  it("returns 'Paciente no encontrado' when patient belongs to a different org", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPatientByIdMock.mockResolvedValueOnce(null);

    const result = await changePatientStatus({
      id: PATIENT_ID,
      status: "BLOCKED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Paciente no encontrado");
    }
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
    // And the action must have queried with the right org.
    expect(getPatientByIdMock).toHaveBeenCalledWith(ORG_ID, PATIENT_ID);
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await changePatientStatus({
      id: PATIENT_ID,
      status: "BLOCKED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getPatientByIdMock).not.toHaveBeenCalled();
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
  });
});
