/**
 * Tests for the `updateService` Server Action.
 *
 * Mirrors the `updatePatient` test strategy with one extra boundary:
 * the action also calls `getServiceById` to verify the service exists
 * (and to scope to the org) before delegating to the data layer.
 *
 * Mocked boundaries:
 *   1. `@/lib/prisma`                              — `prisma` (stub — not used directly)
 *   2. `next/headers`                              — `headers()` for session lookup
 *   3. `@/core/auth`                               — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`              — `getOrganizationId()`
 *   5. `next/cache`                                — `revalidatePath()`
 *   6. `@/modules/services/data/service-data`      — `getServiceById`, `updateService`
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";
const SERVICE_ID = "00000000-0000-4000-8000-0000000000c1";

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

const getServiceByIdMock = vi.fn();
const updateServiceDataMock = vi.fn();
vi.mock("@/modules/services/data/service-data", () => ({
  getServiceById: getServiceByIdMock,
  updateService: updateServiceDataMock,
}));

// Import after mocks are in place.
const { updateService } = await import("../update-service.action");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT") {
  return { user: { id: ADMIN_USER_ID, role } };
}

const existingService = {
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

const validUpdate = {
  id: SERVICE_ID,
  name: "Consulta General Editada",
  durationMinutes: 45,
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("updateService action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks after resetAllMocks.
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("updates the service and returns success when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);
    updateServiceDataMock.mockResolvedValueOnce({
      ...existingService,
      ...validUpdate,
    });

    const result = await updateService(validUpdate);

    expect(result.success).toBe(true);
  });

  it("calls revalidatePath('/dashboard/services') after a successful update", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);
    updateServiceDataMock.mockResolvedValueOnce({
      ...existingService,
      ...validUpdate,
    });

    await updateService(validUpdate);

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/services");
  });

  it("queries getServiceById with (ORG_ID, id) before updating", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);
    updateServiceDataMock.mockResolvedValueOnce({
      ...existingService,
      ...validUpdate,
    });

    await updateService(validUpdate);

    expect(getServiceByIdMock).toHaveBeenCalledWith(ORG_ID, SERVICE_ID);
  });

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  it("returns 'Servicio no encontrado' when getServiceById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(null);

    const result = await updateService(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Servicio no encontrado");
    }
    expect(updateServiceDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Wrong org — getServiceById is org-scoped, returns null
  // -------------------------------------------------------------------------

  it("returns 'Servicio no encontrado' when service belongs to a different org", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    // Simulate: action calls getServiceById(ORG_ID, id) → null because
    // the service is in a different organization.
    getServiceByIdMock.mockResolvedValueOnce(null);

    const result = await updateService(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Servicio no encontrado");
    }
    expect(updateServiceDataMock).not.toHaveBeenCalled();
    // And the action must have queried with the right org.
    expect(getServiceByIdMock).toHaveBeenCalledWith(ORG_ID, SERVICE_ID);
  });

  // -------------------------------------------------------------------------
  // Bad UUID — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects when id is not a valid UUID", async () => {
    // No session mock needed: Zod parse fails first.
    const result = await updateService({
      id: "not-a-uuid",
      name: "X",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod error for the uuid field.
      expect(result.error.toLowerCase()).toContain("servicio");
    }
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(getServiceByIdMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // P2025 — record not found inside the update transaction
  // -------------------------------------------------------------------------

  it("returns 'Servicio no encontrado' when updateService throws P2025", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);

    const p2025 = new Prisma.PrismaClientKnownRequestError(
      "Record to update not found",
      { code: "P2025", clientVersion: "test" },
    );
    updateServiceDataMock.mockRejectedValueOnce(p2025);

    const result = await updateService({ id: SERVICE_ID, name: "X" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Servicio no encontrado");
    }
  });

  // -------------------------------------------------------------------------
  // RBAC — PROFESSIONAL role rejected (read-only per AD3)
  // -------------------------------------------------------------------------

  it("rejects PROFESSIONAL role with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await updateService(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getServiceByIdMock).not.toHaveBeenCalled();
    expect(updateServiceDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // RBAC — PATIENT role rejected (defense-in-depth)
  // -------------------------------------------------------------------------

  it("rejects PATIENT role with 'No autorizado' (defense-in-depth)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await updateService(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getServiceByIdMock).not.toHaveBeenCalled();
    expect(updateServiceDataMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await updateService(validUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getServiceByIdMock).not.toHaveBeenCalled();
    expect(updateServiceDataMock).not.toHaveBeenCalled();
  });
});
