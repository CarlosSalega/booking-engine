/**
 * Tests for the `updateBookings` Server Action.
 *
 * Same boundaries as `updateBusiness`, but with booking-section
 * validation. The test focuses on the booking rules:
 *   - defaultDurationMinutes: 5-480 (int)
 *   - minAdvanceBookingHours: 0-168 (int)
 *   - maxBookingsPerDay:      1-200 (int)
 *   - bufferMinutes:          0-120 (int)
 *
 * The orchestration (Zod → session → RBAC → upsert → updateTag) is the
 * same as `updateBusiness`; only the section schema and the persisted
 * payload shape differ.
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

const { updateBookings } = await import("../update-settings.action");

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
) {
  return { user: { id: ADMIN_USER_ID, role } };
}

const validInput = {
  defaultDurationMinutes: 45,
  minAdvanceBookingHours: 2,
  maxBookingsPerDay: 30,
  bufferMinutes: 15,
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
  defaultDurationMinutes: 45,
  minAdvanceBookingHours: 2,
  maxBookingsPerDay: 30,
  bufferMinutes: 15,
  cancellationEnabled: true,
  cancellationLimitHours: 24,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("updateBookings action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("updates booking config and returns success for ADMIN", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateBookings(validInput);

    expect(result.success).toBe(true);
  });

  it("delegates to upsertSettings(orgId, parsed.data)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    await updateBookings(validInput);

    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, validInput);
  });

  it("calls updateTag('settings') after a successful write (cache invalidation)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    await updateBookings(validInput);

    expect(updateTagMock).toHaveBeenCalledWith("settings");
  });

  it("accepts a partial booking update (only `defaultDurationMinutes`)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateBookings({ defaultDurationMinutes: 60 });

    expect(result.success).toBe(true);
    expect(upsertSettingsMock).toHaveBeenCalledWith(ORG_ID, {
      defaultDurationMinutes: 60,
    });
  });

  it("accepts the boundary values (5, 480, 0, 168, 1, 200, 0, 120)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateBookings({
      defaultDurationMinutes: 5,
      minAdvanceBookingHours: 0,
      maxBookingsPerDay: 1,
      bufferMinutes: 0,
    });

    expect(result.success).toBe(true);
  });

  it("accepts the upper boundary values (480, 168, 200, 120)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    upsertSettingsMock.mockResolvedValueOnce(persistedRow);

    const result = await updateBookings({
      defaultDurationMinutes: 480,
      minAdvanceBookingHours: 168,
      maxBookingsPerDay: 200,
      bufferMinutes: 120,
    });

    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // RBAC — only ADMIN may update settings
  // -------------------------------------------------------------------------

  it("rejects SECRETARY with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    const result = await updateBookings(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects PROFESSIONAL with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PROFESSIONAL"));

    const result = await updateBookings(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects PATIENT with 'No autorizado'", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("PATIENT"));

    const result = await updateBookings(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("returns 'No autorizado' when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await updateBookings(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Zod 4 validation — range guards
  // -------------------------------------------------------------------------

  it("rejects defaultDurationMinutes below 5", async () => {
    const result = await updateBookings({ defaultDurationMinutes: 4 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("duración");
    }
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects defaultDurationMinutes above 480", async () => {
    const result = await updateBookings({ defaultDurationMinutes: 481 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects minAdvanceBookingHours below 0", async () => {
    const result = await updateBookings({ minAdvanceBookingHours: -1 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects minAdvanceBookingHours above 168", async () => {
    const result = await updateBookings({ minAdvanceBookingHours: 169 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects maxBookingsPerDay below 1", async () => {
    const result = await updateBookings({ maxBookingsPerDay: 0 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects maxBookingsPerDay above 200", async () => {
    const result = await updateBookings({ maxBookingsPerDay: 201 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects bufferMinutes below 0", async () => {
    const result = await updateBookings({ bufferMinutes: -1 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects bufferMinutes above 120", async () => {
    const result = await updateBookings({ bufferMinutes: 121 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  it("rejects non-integer defaultDurationMinutes", async () => {
    const result = await updateBookings({ defaultDurationMinutes: 30.5 });

    expect(result.success).toBe(false);
    expect(upsertSettingsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cache invalidation is conditional on success
  // -------------------------------------------------------------------------

  it("does NOT call updateTag when the action fails (Zod)", async () => {
    await updateBookings({ defaultDurationMinutes: 4 });

    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("does NOT call updateTag when the action fails (RBAC)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    await updateBookings(validInput);

    expect(updateTagMock).not.toHaveBeenCalled();
  });
});
