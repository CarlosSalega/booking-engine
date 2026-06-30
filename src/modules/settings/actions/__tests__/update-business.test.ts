/**
 * Tests for the `updateBusiness` Server Action.
 *
 * Mirrors the `createService` test strategy. The action depends on five
 * boundaries, each mocked explicitly:
 *
 *   1. `next/headers`                                  — `headers()` for session lookup
 *   2. `@/core/auth`                                   — `auth.api.getSession(...)`
 *   3. `@/modules/dashboard/data/...`                  — `getOrganizationId()`
 *   4. `next/cache`                                    — `updateTag("settings")`
 *   5. `@/modules/settings/data/settings-data`         — `upsertSettings` (data layer)
 *
 * The data layer's `upsertSettings` is mocked so the test focuses on
 * the action's orchestration: Zod, auth, RBAC, updateTag.
 *
 * RBAC: only ADMIN may update settings. SECRETARY is read-only (the
 * form layer disables all fields), PROFESSIONAL is rejected (per
 * AD3), PATIENT is defense-in-depth (rejected at the dashboard
 * layout AND here).
 *
 * Spec source: `openspec/changes/settings/specs/settings-domain/spec.md`
 *   — Requirement: Validation Schemas
 *   — Requirement: Repository Contract
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the import of the action under test.
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";

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

const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  updateTag: updateTagMock,
}));

// Mock the data layer's upsertSettings so the test focuses on the
// action's orchestration. Same path the action imports from.
const upsertSettingsMock = vi.fn();
vi.mock("@/modules/settings/data/settings-data", () => ({
  upsertSettings: upsertSettingsMock,
}));

// Import after mocks are in place.
const { updateBusiness } = await import("../update-settings.action");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
) {
  return { user: { id: ADMIN_USER_ID, role } };
}

const validInput = {
  name: "Clínica Demo",
  description: "Atención integral",
  address: "Av. Siempre Viva 742",
  timezone: "America/Argentina/Buenos_Aires",
  phone: "+5491144440000",
  email: "demo@clinica.test",
};

const persistedRow = {
  id: "00000000-0000-4000-8000-0000000000a1",
  organizationId: ORG_ID,
  name: "Clínica Demo",
  description: "Atención integral",
  address: "Av. Siempre Viva 742",
  timezone: "America/Argentina/Buenos_Aires",
  phone: "+5491144440000",
  email: "demo@clinica.test",
  defaultDurationMinutes: 30,
  minAdvanceBookingHours: 1,
  maxBookingsPerDay: 50,
  bufferMinutes: 0,
  cancellationEnabled: true,
  cancellationLimitHours: 24,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("updateBusiness action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("updates business config and returns success for ADMIN", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateBusiness(validInput);

    expect(result.success).toBe(true);
  });

  it("delegates to upsertSettings(orgId, parsed.data)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    await updateBusiness(validInput);

    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, validInput);
  });

  it("calls updateTag('settings') after a successful write (cache invalidation)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    await updateBusiness(validInput);

    expect(updateTagMock).toHaveBeenCalledWith("settings");
  });

  it("accepts a partial business update (only `name`)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce({
      ...persistedRow,
      name: "Nueva Clínica",
    });

    const result = await updateBusiness({ name: "Nueva Clínica" });

    expect(result.success).toBe(true);
    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, {
      name: "Nueva Clínica",
    });
  });

  it("accepts null values for clearing optional fields (description, address, phone, email)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateBusiness({
      name: "Clínica",
      description: null,
      address: null,
      phone: null,
      email: null,
    });

    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // RBAC — only ADMIN may update settings
  // -------------------------------------------------------------------------

  it("rejects SECRETARY with 'No autorizado' (read-only per AD3)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    const result = await updateBusiness(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("rejects PROFESSIONAL with 'No autorizado' (defense-in-depth)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await updateBusiness(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects PATIENT with 'No autorizado' (defense-in-depth; layout also blocks)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await updateBusiness(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await updateBusiness(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Zod 4 validation
  // -------------------------------------------------------------------------

  it("rejects an empty name with a Spanish error", async () => {
    const result = await updateBusiness({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("nombre");
    }
    // Session / data layer / cache MUST NOT be touched.
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(upsertSettingsMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 100 characters", async () => {
    const result = await updateBusiness({ name: "a".repeat(101) });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects a description longer than 500 characters", async () => {
    const result = await updateBusiness({
      name: "OK",
      description: "a".repeat(501),
    });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects an address longer than 200 characters", async () => {
    const result = await updateBusiness({
      name: "OK",
      address: "a".repeat(201),
    });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const result = await updateBusiness({ name: "OK", email: "bad" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("email");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed phone", async () => {
    const result = await updateBusiness({ name: "OK", phone: "abc" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("teléfono");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects an empty timezone (required, non-empty)", async () => {
    const result = await updateBusiness({ name: "OK", timezone: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("timezone");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cache invalidation is conditional on success
  // -------------------------------------------------------------------------

  it("does NOT call updateTag when the action fails (Zod)", async () => {
    await updateBusiness({ name: "" });

    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("does NOT call updateTag when the action fails (RBAC)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    await updateBusiness(validInput);

    expect(updateTagMock).not.toHaveBeenCalled();
  });
});
