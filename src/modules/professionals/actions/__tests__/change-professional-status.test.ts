/**
 * Tests for the `changeProfessionalStatus` Server Action.
 *
 * Mirrors the `changeServiceStatus` test strategy. The action:
 *   1. Validates `{ id, status }` with Zod 4
 *   2. Enforces RBAC (PROFESSIONAL/PATIENT rejected)
 *   3. Verifies the professional exists in the org via `getProfessionalById`
 *   4. Updates status via `prisma.professional.update`
 *   5. Revalidates `/dashboard/professionals`
 *
 * Per design AD4, no state machine — any ACTIVE↔INACTIVE transition is
 * valid. This mirrors the services status toggle exactly.
 *
 * Mocked boundaries:
 *   1. `@/lib/prisma`                              — `prisma.professional.update`
 *   2. `next/headers`                              — `headers()` for session lookup
 *   3. `@/core/auth`                               — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`              — `getOrganizationId()`
 *   5. `next/cache`                                — `revalidatePath()`
 *   6. `@/modules/professionals/data/...`         — `getProfessionalById`
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";
const PROFESSIONAL_USER_ID = "00000000-0000-4000-8000-0000000000b2";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE the import of the action under test.
// The action calls prisma.professional.update directly for the simple
// status field update.
// ---------------------------------------------------------------------------

const prismaMock = vi.hoisted(() => ({
  professional: {
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

const getProfessionalByIdMock = vi.fn();
vi.mock("@/modules/professionals/data/professional-data", () => ({
  getProfessionalById: getProfessionalByIdMock,
}));

// Import after mocks are in place.
const { changeProfessionalStatus } = await import(
  "../change-professional-status.action"
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
) {
  return { user: { id: ADMIN_USER_ID, role } };
}

const existingProfessional = {
  id: PROFESSIONAL_ID,
  organizationId: ORG_ID,
  userId: PROFESSIONAL_USER_ID,
  fullName: "Dr. García",
  email: "garcia@test.com",
  image: undefined,
  specialties: ["Dermatología"],
  license: "MN-12345",
  bio: "15 years of experience",
  status: "ACTIVE" as const,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("changeProfessionalStatus action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path — valid transition ACTIVE → INACTIVE
  // -------------------------------------------------------------------------

  it("updates the status and returns success for ACTIVE → INACTIVE (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    prismaMock.professional.update.mockResolvedValueOnce({});

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Happy path — valid transition INACTIVE → ACTIVE (no state machine)
  // -------------------------------------------------------------------------

  it("updates the status for INACTIVE → ACTIVE (no state machine, AD4)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce({
      ...existingProfessional,
      status: "INACTIVE",
    });
    prismaMock.professional.update.mockResolvedValueOnce({});

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("calls prisma.professional.update with the new status", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    prismaMock.professional.update.mockResolvedValueOnce({});

    await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(prismaMock.professional.update).toHaveBeenCalledWith({
      where: { id: PROFESSIONAL_ID },
      data: { status: "INACTIVE" },
    });
  });

  it("calls revalidatePath('/dashboard/professionals') after a successful status change", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    prismaMock.professional.update.mockResolvedValueOnce({});

    await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dashboard/professionals",
    );
  });

  it("changes the status for SECRETARY role (also authorized)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    prismaMock.professional.update.mockResolvedValueOnce({});

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Bad enum — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects when status is not a valid ProfessionalStatus", async () => {
    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      // @ts-expect-error testing invalid input at runtime
      status: "PENDING",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod error for the enum field.
      expect(result.error.toLowerCase()).toContain("status");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  it("returns 'Profesional no encontrado' when getProfessionalById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(null);

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profesional no encontrado");
    }
    expect(prismaMock.professional.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Wrong org — getProfessionalById is org-scoped, returns null
  // -------------------------------------------------------------------------

  it("returns 'Profesional no encontrado' when professional belongs to a different org", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(null);

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profesional no encontrado");
    }
    expect(prismaMock.professional.update).not.toHaveBeenCalled();
    // And the action must have queried with the right org.
    expect(getProfessionalByIdMock).toHaveBeenCalledWith(
      ORG_ID,
      PROFESSIONAL_ID,
    );
  });

  // -------------------------------------------------------------------------
  // Bad UUID — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects when id is not a valid UUID", async () => {
    const result = await changeProfessionalStatus({
      id: "not-a-uuid",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod error for the uuid field.
      expect(result.error.toLowerCase()).toContain("profesional");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(getProfessionalByIdMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // RBAC — PROFESSIONAL role rejected (read-only per AD3)
  // -------------------------------------------------------------------------

  it("rejects PROFESSIONAL role with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getProfessionalByIdMock).not.toHaveBeenCalled();
    expect(prismaMock.professional.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await changeProfessionalStatus({
      id: PROFESSIONAL_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getProfessionalByIdMock).not.toHaveBeenCalled();
    expect(prismaMock.professional.update).not.toHaveBeenCalled();
  });
});
