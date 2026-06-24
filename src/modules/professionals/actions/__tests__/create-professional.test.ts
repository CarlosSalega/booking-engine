/**
 * Tests for the `createProfessional` Server Action.
 *
 * Mirrors the `createService` test strategy. The action depends on six
 * boundaries, each mocked explicitly:
 *
 *   1. `@/lib/prisma`                              — stub (not used directly)
 *   2. `next/headers`                              — `headers()` for session lookup
 *   3. `@/core/auth`                               — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`              — `getOrganizationId()`
 *   5. `next/cache`                                — `revalidatePath()`
 *   6. `@/modules/professionals/data/...`         — `createProfessional` (data layer)
 *
 * The data layer's `createProfessional` is mocked so the test focuses on
 * the action's orchestration: Zod, auth, RBAC, P2002 → email-dup mapping,
 * revalidatePath.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures — declared with vi.hoisted so the mock factories can
// reference them (vi.mock is hoisted BEFORE ordinary const initializers).
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";
const PROFESSIONAL_USER_ID = "00000000-0000-4000-8000-0000000000b2";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the import of the action under test.
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

// Mock the data layer's createProfessional so the test focuses on the
// action's orchestration: Zod, auth, RBAC, P2002 → email-dup, revalidatePath.
const createProfessionalDataMock = vi.fn();
vi.mock("@/modules/professionals/data/professional-data", () => ({
  createProfessional: createProfessionalDataMock,
}));

// Import after mocks are in place.
const { createProfessional } = await import("../create-professional.action");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
) {
  return { user: { id: ADMIN_USER_ID, role } };
}

const validInput = {
  fullName: "Dr. García",
  email: "garcia@test.com",
  specialties: ["Dermatología"],
  status: "ACTIVE" as const,
};

const createdProfessional = {
  id: PROFESSIONAL_ID,
  organizationId: ORG_ID,
  userId: PROFESSIONAL_USER_ID,
  fullName: "Dr. García",
  email: "garcia@test.com",
  image: undefined,
  specialties: ["Dermatología"],
  license: undefined,
  bio: undefined,
  status: "ACTIVE" as const,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("createProfessional action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks after resetAllMocks cleared them.
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("creates a professional and returns the id when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // Data layer createProfessional returns the enriched professional.
    createProfessionalDataMock.mockResolvedValueOnce(createdProfessional);

    const result = await createProfessional(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(PROFESSIONAL_ID);
    }
  });

  it("creates a professional for SECRETARY role (also authorized)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
    createProfessionalDataMock.mockResolvedValueOnce(createdProfessional);

    const result = await createProfessional(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(PROFESSIONAL_ID);
    }
  });

  it("calls revalidatePath('/dashboard/professionals') after a successful create", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    createProfessionalDataMock.mockResolvedValueOnce(createdProfessional);

    await createProfessional(validInput);

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dashboard/professionals",
    );
  });

  it("delegates to the data layer's createProfessional with (orgId, data)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    createProfessionalDataMock.mockResolvedValueOnce(createdProfessional);

    await createProfessional(validInput);

    expect(createProfessionalDataMock).toHaveBeenCalledWith(
      ORG_ID,
      validInput,
    );
  });

  // -------------------------------------------------------------------------
  // RBAC — PROFESSIONAL role rejected (read-only, per design AD3)
  // -------------------------------------------------------------------------

  it("rejects PROFESSIONAL role with 'No autorizado' and does not call data layer", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await createProfessional(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createProfessionalDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected (defense-in-depth; layout also blocks)
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado' (defense-in-depth)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await createProfessional(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createProfessionalDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Invalid input — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects empty fullName with a Spanish error message", async () => {
    // No session mock needed: Zod parse fails first. Empty `fullName` is a
    // valid `string` at the type level but is rejected at runtime by the
    // schema's `min(1)` constraint.
    const result = await createProfessional({ ...validInput, fullName: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("full name");
    }
    // Session / data layer must NOT be touched.
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(createProfessionalDataMock).not.toHaveBeenCalled();
  });

  it("rejects invalid email with a Spanish error message", async () => {
    const result = await createProfessional({
      ...validInput,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("email");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(createProfessionalDataMock).not.toHaveBeenCalled();
  });

  it("rejects empty specialties array with a Spanish error message", async () => {
    const result = await createProfessional({ ...validInput, specialties: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("specialty");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(createProfessionalDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // P2002 — duplicate email from the User table
  // -------------------------------------------------------------------------

  it("returns 'Ya existe un profesional con ese email' when data layer throws P2002", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    // Simulate Prisma P2002 from the data layer's split-write transaction.
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      { code: "P2002", clientVersion: "test" },
    );
    createProfessionalDataMock.mockRejectedValueOnce(p2002);

    const result = await createProfessional(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ya existe un profesional con ese email");
    }
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createProfessional(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createProfessionalDataMock).not.toHaveBeenCalled();
  });
});
