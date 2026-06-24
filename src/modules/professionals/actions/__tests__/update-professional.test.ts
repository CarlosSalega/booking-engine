/**
 * Tests for the `updateProfessional` Server Action.
 *
 * Mirrors the `updateService` test strategy. The action depends on seven
 * boundaries, each mocked explicitly:
 *
 *   1. `@/lib/prisma`                              — `prisma` (stub — not used directly)
 *   2. `next/headers`                              — `headers()` for session lookup
 *   3. `@/core/auth`                               — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`              — `getOrganizationId()`
 *   5. `next/cache`                                — `revalidatePath()`
 *   6. `@/modules/professionals/data/...`         — `getProfessionalById`,
 *                                                   `updateProfessional`
 *
 * The data layer's `getProfessionalById` is used as an org-scope guard
 * (returns null when missing or in a different org), and `updateProfessional`
 * is the split-write. We mock both so the test focuses on the action's
 * orchestration: Zod, auth, RBAC, the by-id guard, and the P2025 race.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";
const PROFESSIONAL_USER_ID = "00000000-0000-4000-8000-0000000000b2";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

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
const updateProfessionalDataMock = vi.fn();
vi.mock("@/modules/professionals/data/professional-data", () => ({
  getProfessionalById: getProfessionalByIdMock,
  updateProfessional: updateProfessionalDataMock,
}));

// Import after mocks are in place.
const { updateProfessional } = await import("../update-professional.action");

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

const validUpdate = {
  id: PROFESSIONAL_ID,
  fullName: "Dr. García Updated",
  specialties: ["Cirugía"],
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("updateProfessional action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks after resetAllMocks.
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("updates the professional and returns success when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    updateProfessionalDataMock.mockResolvedValueOnce({
      ...existingProfessional,
      ...validUpdate,
    });

    const result = await updateProfessional(validUpdate);

    expect(result.success).toBe(true);
  });

  it("calls revalidatePath('/dashboard/professionals') after a successful update", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    updateProfessionalDataMock.mockResolvedValueOnce({
      ...existingProfessional,
      ...validUpdate,
    });

    await updateProfessional(validUpdate);

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dashboard/professionals",
    );
  });

  it("queries getProfessionalById with (ORG_ID, id) before updating", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    updateProfessionalDataMock.mockResolvedValueOnce({
      ...existingProfessional,
      ...validUpdate,
    });

    await updateProfessional(validUpdate);

    expect(getProfessionalByIdMock).toHaveBeenCalledWith(
      ORG_ID,
      PROFESSIONAL_ID,
    );
  });

  it("passes the data fields (without id) to the data layer's updateProfessional", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);
    updateProfessionalDataMock.mockResolvedValueOnce({
      ...existingProfessional,
      ...validUpdate,
    });

    const dataWithoutId = {
      fullName: validUpdate.fullName,
      specialties: validUpdate.specialties,
    };
    await updateProfessional(validUpdate);

    expect(updateProfessionalDataMock).toHaveBeenCalledWith(
      ORG_ID,
      PROFESSIONAL_ID,
      dataWithoutId,
    );
  });

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  it("returns 'Profesional no encontrado' when getProfessionalById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(null);

    const result = await updateProfessional(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profesional no encontrado");
    }
    expect(updateProfessionalDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Wrong org — getProfessionalById is org-scoped, returns null
  // -------------------------------------------------------------------------

  it("returns 'Profesional no encontrado' when professional belongs to a different org", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // Simulate: action calls getProfessionalById(ORG_ID, id) → null because
    // the professional is in a different organization.
    getProfessionalByIdMock.mockResolvedValueOnce(null);

    const result = await updateProfessional(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profesional no encontrado");
    }
    expect(updateProfessionalDataMock).not.toHaveBeenCalled();
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
    // No session mock needed: Zod parse fails first.
    const result = await updateProfessional({
      id: "not-a-uuid",
      fullName: "X",
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
  // P2025 — record not found inside the update transaction
  // -------------------------------------------------------------------------

  it("returns 'Profesional no encontrado' when updateProfessional throws Prisma P2025", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);

    const p2025 = new Prisma.PrismaClientKnownRequestError(
      "Record to update not found",
      { code: "P2025", clientVersion: "test" },
    );
    updateProfessionalDataMock.mockRejectedValueOnce(p2025);

    const result = await updateProfessional({
      id: PROFESSIONAL_ID,
      fullName: "X",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profesional no encontrado");
    }
  });

  // -------------------------------------------------------------------------
  // P2002 — duplicate email when renaming
  // -------------------------------------------------------------------------

  it("returns 'Ya existe un profesional con ese email' when updateProfessional throws P2002", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getProfessionalByIdMock.mockResolvedValueOnce(existingProfessional);

    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      { code: "P2002", clientVersion: "test" },
    );
    updateProfessionalDataMock.mockRejectedValueOnce(p2002);

    const result = await updateProfessional({
      id: PROFESSIONAL_ID,
      email: "taken@other.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ya existe un profesional con ese email");
    }
  });

  // -------------------------------------------------------------------------
  // RBAC — PROFESSIONAL role rejected (read-only per AD3)
  // -------------------------------------------------------------------------

  it("rejects PROFESSIONAL role with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await updateProfessional(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getProfessionalByIdMock).not.toHaveBeenCalled();
    expect(updateProfessionalDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected (defense-in-depth)
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado' (defense-in-depth)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await updateProfessional(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getProfessionalByIdMock).not.toHaveBeenCalled();
    expect(updateProfessionalDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await updateProfessional(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getProfessionalByIdMock).not.toHaveBeenCalled();
    expect(updateProfessionalDataMock).not.toHaveBeenCalled();
  });
});
