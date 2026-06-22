/**
 * Tests for the `changeServiceStatus` Server Action.
 *
 * Mirrors the `changePatientStatus` test strategy. The action:
 *   1. Validates `{ id, status }` with Zod 4
 *   2. Enforces RBAC (PROFESSIONAL/PATIENT rejected)
 *   3. Verifies the service exists in the org via `getServiceById`
 *   4. Updates status via `prisma.service.update`
 *   5. Revalidates `/dashboard/services`
 *
 * Per AD4, no state machine — any ACTIVE↔INACTIVE transition is valid.
 *
 * Mocked boundaries:
 *   1. `@/lib/prisma`                              — `prisma.service.update`
 *   2. `next/headers`                              — `headers()` for session lookup
 *   3. `@/core/auth`                               — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...`              — `getOrganizationId()`
 *   5. `next/cache`                                — `revalidatePath()`
 *   6. `@/modules/services/data/service-data`      — `getServiceById`
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-0000000000b1";
const SERVICE_ID = "00000000-0000-4000-8000-0000000000c1";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE the import of the action under test.
// The action calls prisma.service.update directly for the simple
// status field update (no data-layer write, no overlap/availability).
// ---------------------------------------------------------------------------

const prismaMock = vi.hoisted(() => ({
  service: {
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

const getServiceByIdMock = vi.fn();
vi.mock("@/modules/services/data/service-data", () => ({
  getServiceById: getServiceByIdMock,
}));

// Import after mocks are in place.
const { changeServiceStatus } = await import("../change-service-status.action");

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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("changeServiceStatus action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path — valid transition ACTIVE → INACTIVE
  // -------------------------------------------------------------------------

  it("updates the status and returns success for ACTIVE → INACTIVE (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);
    prismaMock.service.update.mockResolvedValueOnce({});

    const result = await changeServiceStatus({
      id: SERVICE_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Happy path — valid transition INACTIVE → ACTIVE (no state machine)
  // -------------------------------------------------------------------------

  it("updates the status for INACTIVE → ACTIVE (no state machine, AD4)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce({
      ...existingService,
      status: "INACTIVE",
    });
    prismaMock.service.update.mockResolvedValueOnce({});

    const result = await changeServiceStatus({
      id: SERVICE_ID,
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("calls prisma.service.update with the new status", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);
    prismaMock.service.update.mockResolvedValueOnce({});

    await changeServiceStatus({ id: SERVICE_ID, status: "INACTIVE" });

    expect(prismaMock.service.update).toHaveBeenCalledWith({
      where: { id: SERVICE_ID },
      data: { status: "INACTIVE" },
    });
  });

  it("calls revalidatePath('/dashboard/services') after a successful status change", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(existingService);
    prismaMock.service.update.mockResolvedValueOnce({});

    await changeServiceStatus({ id: SERVICE_ID, status: "INACTIVE" });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/services");
  });

  // -------------------------------------------------------------------------
  // Bad enum — Zod rejects
  // -------------------------------------------------------------------------

  it("rejects when status is not a valid ServiceStatus", async () => {
    const result = await changeServiceStatus({
      id: SERVICE_ID,
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

  it("returns 'Servicio no encontrado' when getServiceById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(null);

    const result = await changeServiceStatus({
      id: SERVICE_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Servicio no encontrado");
    }
    expect(prismaMock.service.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Wrong org — getServiceById is org-scoped, returns null
  // -------------------------------------------------------------------------

  it("returns 'Servicio no encontrado' when service belongs to a different org", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getServiceByIdMock.mockResolvedValueOnce(null);

    const result = await changeServiceStatus({
      id: SERVICE_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Servicio no encontrado");
    }
    expect(prismaMock.service.update).not.toHaveBeenCalled();
    // And the action must have queried with the right org.
    expect(getServiceByIdMock).toHaveBeenCalledWith(ORG_ID, SERVICE_ID);
  });

  // -------------------------------------------------------------------------
  // RBAC — PROFESSIONAL role rejected (read-only per AD3)
  // -------------------------------------------------------------------------

  it("rejects PROFESSIONAL role with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await changeServiceStatus({
      id: SERVICE_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getServiceByIdMock).not.toHaveBeenCalled();
    expect(prismaMock.service.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No session — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await changeServiceStatus({
      id: SERVICE_ID,
      status: "INACTIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(getServiceByIdMock).not.toHaveBeenCalled();
    expect(prismaMock.service.update).not.toHaveBeenCalled();
  });
});
