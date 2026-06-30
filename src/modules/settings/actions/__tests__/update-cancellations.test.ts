/**
 * Tests for the `updateCancellations` Server Action.
 *
 * Same boundaries as `updateBusiness` / `updateBookings`, but with the
 * cancellation section schema. The test focuses on:
 *   - cancellationEnabled: boolean
 *   - cancellationLimitHours: 0-168 (int)
 *
 * The orchestration (Zod → session → RBAC → upsert → updateTag) is
 * shared with the other two actions; only the section schema and the
 * persisted payload shape differ.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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

const upsertSettingsMock = vi.fn();
vi.mock("@/modules/settings/data/settings-data", () => ({
  upsertSettings: upsertSettingsMock,
}));

const { updateCancellations } = await import("../update-settings.action");

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
) {
  return { user: { id: ADMIN_USER_ID, role } };
}

const validInput = {
  cancellationEnabled: false,
  cancellationLimitHours: 48,
};

const persistedRow = {
  id: "00000000-0000-4000-8000-0000000000a1",
  organizationId: ORG_ID,
  name: "",
  description: null,
  address: null,
  timezone: "America/Argentina/Buenos_Aires",
  phone: null,
  email: null,
  defaultDurationMinutes: 30,
  minAdvanceBookingHours: 1,
  maxBookingsPerDay: 50,
  bufferMinutes: 0,
  cancellationEnabled: false,
  cancellationLimitHours: 48,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("updateCancellations action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("updates cancellation config and returns success for ADMIN", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateCancellations(validInput);

    expect(result.success).toBe(true);
  });

  it("delegates to upsertSettings(orgId, parsed.data)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    await updateCancellations(validInput);

    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, validInput);
  });

  it("calls updateTag('settings') after a successful write (cache invalidation)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    await updateCancellations(validInput);

    expect(updateTagMock).toHaveBeenCalledWith("settings");
  });

  it("accepts a partial cancellation update (only `cancellationEnabled`)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateCancellations({ cancellationEnabled: true });

    expect(result.success).toBe(true);
    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, {
      cancellationEnabled: true,
    });
  });

  it("accepts a partial cancellation update (only `cancellationLimitHours`)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateCancellations({ cancellationLimitHours: 12 });

    expect(result.success).toBe(true);
    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, {
      cancellationLimitHours: 12,
    });
  });

  it("accepts the boundary values (0 and 168)", async () => {
    // The two calls share the same ADMIN session and data-layer mock —
    // `mockResolvedValue` (no `Once`) applies for the whole test.
    getSessionMock.mockResolvedValue(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValue(persistedRow);

    const lower = await updateCancellations({ cancellationLimitHours: 0 });
    const upper = await updateCancellations({ cancellationLimitHours: 168 });

    expect(lower.success).toBe(true);
    expect(upper.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // RBAC — only ADMIN may update settings
  // -------------------------------------------------------------------------

  it("rejects SECRETARY with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    const result = await updateCancellations(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects PROFESSIONAL with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await updateCancellations(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects PATIENT with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await updateCancellations(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await updateCancellations(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Zod 4 validation
  // -------------------------------------------------------------------------

  it("rejects cancellationLimitHours below 0", async () => {
    const result = await updateCancellations({ cancellationLimitHours: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("cancelación");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects cancellationLimitHours above 168", async () => {
    const result = await updateCancellations({ cancellationLimitHours: 169 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects a non-integer cancellationLimitHours", async () => {
    const result = await updateCancellations({
      cancellationLimitHours: 24.5,
    });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean cancellationEnabled", async () => {
    const result = await updateCancellations({
      cancellationEnabled: "yes" as unknown as boolean,
    });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cache invalidation is conditional on success
  // -------------------------------------------------------------------------

  it("does NOT call updateTag when the action fails (Zod)", async () => {
    await updateCancellations({ cancellationLimitHours: -1 });

    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("does NOT call updateTag when the action fails (RBAC)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    await updateCancellations(validInput);

    expect(updateTagMock).not.toHaveBeenCalled();
  });
});
