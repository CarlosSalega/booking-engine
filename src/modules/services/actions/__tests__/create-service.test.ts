/**
 * Tests for the `createService` Server Action.
 *
 * Mirrors the `createPatient` test strategy. The action depends on five
 * boundaries, each mocked explicitly:
 *
 *   1. `@/lib/prisma`                              — stub (not used directly)
 *   2. `next/headers`                              — `headers()` for session lookup
 *   3. `@/core/auth`                               — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`              — `getOrganizationId()`
 *   5. `next/cache`                                — `revalidatePath()`
 *   6. `@/modules/services/data/service-data`      — `createService` (data layer)
 *
 * The data layer's `createService` is mocked so the test focuses on the
 * action's orchestration: Zod, auth, RBAC, revalidatePath.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Test fixtures — declared with vi.hoisted so the mock factories can
// reference them (vi.mock is hoisted BEFORE ordinary const initializers).
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";
const SERVICE_ID = "00000000-0000-4000-8000-0000000000c1";

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

// Mock the data layer's createService so the test focuses on the action's
// orchestration: Zod, auth, RBAC, revalidatePath.
const createServiceDataMock = vi.fn();
vi.mock("@/modules/services/data/service-data", () => ({
  createService: createServiceDataMock,
}));

// Import after mocks are in place.
const { createService } = await import("../create-service.action");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return { user: { id: ADMIN_USER_ID, role } };
}

const validInput = {
  name: "Consulta General",
  description: "Consulta médica general",
  durationMinutes: 30,
  price: { amount: 2000, currency: "ARS" as const },
  paymentType: "NONE" as const,
  professionalId: PROFESSIONAL_ID,
  status: "ACTIVE" as const,
};

const createdService = {
  id: SERVICE_ID,
  organizationId: ORG_ID,
  name: "Consulta General",
  description: "Consulta médica general",
  durationMinutes: 30,
  price: { amount: 2000, currency: "ARS" as const },
  depositAmount: undefined,
  paymentType: "NONE" as const,
  status: "ACTIVE" as const,
  professionalId: PROFESSIONAL_ID,
  professionalName: "Dr. García",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("createService action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks after resetAllMocks cleared them.
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("creates a service and returns the id when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // Data layer createService returns the enriched service.
    createServiceDataMock.mockResolvedValueOnce(createdService);

    const result = await createService(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(SERVICE_ID);
    }
  });

  it("creates a service for SECRETARY role (also authorized)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
    createServiceDataMock.mockResolvedValueOnce(createdService);

    const result = await createService(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(SERVICE_ID);
    }
  });

  it("calls revalidatePath('/dashboard/services') after a successful create", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    createServiceDataMock.mockResolvedValueOnce(createdService);

    await createService(validInput);

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/services");
  });

  it("delegates to the data layer's createService with (orgId, data)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    createServiceDataMock.mockResolvedValueOnce(createdService);

    await createService(validInput);

    expect(createServiceDataMock).toHaveBeenCalledWith(ORG_ID, validInput);
  });

  // -------------------------------------------------------------------------
  // RBAC — PROFESSIONAL role rejected (read-only, per AD3)
  // -------------------------------------------------------------------------

  it("rejects PROFESSIONAL role with 'No autorizado' and does not call data layer", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await createService(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createServiceDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected (defense-in-depth; layout also blocks)
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado' (defense-in-depth)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await createService(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createServiceDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Invalid input — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects empty name with a Spanish error message", async () => {
    // No session mock needed: Zod parse fails first.
    // @ts-expect-error testing invalid input at runtime
    const result = await createService({ ...validInput, name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("nombre");
    }
    // Session / data layer must NOT be touched.
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(createServiceDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createService(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(createServiceDataMock).not.toHaveBeenCalled();
  });
});
