/**
 * Tests for the settings data provider.
 *
 * Mirrors the services data-layer test strategy: mock the Prisma
 * singleton so the tests are deterministic and fast. The data
 * provider is pure (no IO of its own); Prisma is the only external
 * dependency. Mocking lets us verify the shape, the field composition,
 * the tenant scoping, and the upsert semantics without a real database.
 *
 * Tenant scoping: every query MUST scope to `organizationId`. We
 * assert this on every read.
 *
 * Upsert semantics: the first call for an org creates a row with
 * `SETTINGS_DEFAULTS` spread (any caller-provided fields override the
 * defaults). Subsequent calls update only the provided fields and
 * preserve the rest. Prisma's `upsert` with `where: { organizationId }`
 * is the implementation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing the data provider so vi.mock
// can hoist it. Each test resets and reconfigures the methods it needs.
// ---------------------------------------------------------------------------

const prismaMock = {
  organizationSettings: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Import after the mock is set up.
const { getByOrgId, upsertSettings } = await import("../settings-data");
const { SETTINGS_DEFAULTS } = await import("../../domain/constants");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const SETTINGS_ID = "00000000-0000-4000-8000-0000000000a1";
const CREATED_AT = new Date("2026-01-01T00:00:00Z");
const UPDATED_AT = new Date("2026-01-02T00:00:00Z");

/**
 * Build a Prisma-shaped `OrganizationSettings` row with sensible defaults
 * matching the spec.
 */
function makeDbSettings(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: SETTINGS_ID,
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
    cancellationEnabled: true,
    cancellationLimitHours: 24,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// `getByOrgId`
// ---------------------------------------------------------------------------

describe("getByOrgId", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when no settings exist for the org (greenfield table)", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(null);

    const result = await getByOrgId(ORG_ID);

    expect(result).toBeNull();
  });

  it("scopes the lookup to organizationId via findUnique where clause", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(null);

    await getByOrgId(ORG_ID);

    expect(prismaMock.organizationSettings.findUnique).toHaveBeenCalledTimes(1);
    expect(
      prismaMock.organizationSettings.findUnique.mock.calls[0]?.[0],
    ).toEqual({ where: { organizationId: ORG_ID } });
  });

  it("returns the persisted row when settings exist", async () => {
    const row = makeDbSettings({ name: "Clínica Demo" });
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(row);

    const result = await getByOrgId(ORG_ID);

    expect(result).toEqual(row);
    expect(result?.id).toBe(SETTINGS_ID);
    expect(result?.organizationId).toBe(ORG_ID);
    expect(result?.name).toBe("Clínica Demo");
  });

  it("does not leak data from a different org (cross-tenant protection)", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(null);

    const result = await getByOrgId(OTHER_ORG_ID);

    expect(result).toBeNull();
    expect(
      prismaMock.organizationSettings.findUnique.mock.calls[0]?.[0],
    ).toEqual({ where: { organizationId: OTHER_ORG_ID } });
  });
});

// ---------------------------------------------------------------------------
// `upsertSettings` — first call (create) path
// ---------------------------------------------------------------------------

describe("upsertSettings — create path (first call for org)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("spreads SETTINGS_DEFAULTS into the create payload (spec scenario: first upsert creates)", async () => {
    const created = makeDbSettings({ name: "Clínica Demo" });
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(created);

    await upsertSettings(ORG_ID, { name: "Clínica Demo" });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      where: { organizationId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.where).toEqual({ organizationId: ORG_ID });
    // All default fields are present in the create payload.
    expect(call.create["organizationId"]).toBe(ORG_ID);
    expect(call.create["name"]).toBe("Clínica Demo");
    expect(call.create["timezone"]).toBe(SETTINGS_DEFAULTS.timezone);
    expect(call.create["defaultDurationMinutes"]).toBe(
      SETTINGS_DEFAULTS.defaultDurationMinutes,
    );
    expect(call.create["minAdvanceBookingHours"]).toBe(
      SETTINGS_DEFAULTS.minAdvanceBookingHours,
    );
    expect(call.create["maxBookingsPerDay"]).toBe(
      SETTINGS_DEFAULTS.maxBookingsPerDay,
    );
    expect(call.create["bufferMinutes"]).toBe(SETTINGS_DEFAULTS.bufferMinutes);
    expect(call.create["cancellationEnabled"]).toBe(
      SETTINGS_DEFAULTS.cancellationEnabled,
    );
    expect(call.create["cancellationLimitHours"]).toBe(
      SETTINGS_DEFAULTS.cancellationLimitHours,
    );
    expect(call.create["description"]).toBeNull();
    expect(call.create["address"]).toBeNull();
    expect(call.create["phone"]).toBeNull();
    expect(call.create["email"]).toBeNull();
  });

  it("uses `where: { organizationId }` as the upsert key (unique constraint)", async () => {
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(
      makeDbSettings(),
    );

    await upsertSettings(ORG_ID, { name: "X" });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(call.where).toEqual({ organizationId: ORG_ID });
  });

  it("returns the created row on the first call", async () => {
    const created = makeDbSettings({ name: "Clínica Demo" });
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(created);

    const result = await upsertSettings(ORG_ID, { name: "Clínica Demo" });

    expect(result.id).toBe(SETTINGS_ID);
    expect(result.organizationId).toBe(ORG_ID);
    expect(result.name).toBe("Clínica Demo");
  });

  it("update branch on first call contains only the caller-provided fields (no defaults)", async () => {
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(
      makeDbSettings(),
    );

    await upsertSettings(ORG_ID, { name: "X" });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    // The update branch carries only the caller's payload (or nothing
    // if no payload was provided). It MUST NOT include defaults that
    // would overwrite unrelated columns — the create branch is where
    // defaults are spread.
    expect(call.update).not.toHaveProperty("timezone");
    expect(call.update).not.toHaveProperty("defaultDurationMinutes");
    expect(call.update).not.toHaveProperty("minAdvanceBookingHours");
    expect(call.update).not.toHaveProperty("maxBookingsPerDay");
    expect(call.update).not.toHaveProperty("bufferMinutes");
    expect(call.update).not.toHaveProperty("cancellationEnabled");
    expect(call.update).not.toHaveProperty("cancellationLimitHours");
  });
});

// ---------------------------------------------------------------------------
// `upsertSettings` — update path (subsequent calls)
// ---------------------------------------------------------------------------

describe("upsertSettings — update path (subsequent calls)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("writes only the provided fields in the update branch (spec scenario: second upsert updates)", async () => {
    const updated = makeDbSettings({ name: "Nueva Clínica" });
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(updated);

    await upsertSettings(ORG_ID, { name: "Nueva Clínica" });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).toEqual({ name: "Nueva Clínica" });
    // The update MUST NOT include defaults that would wipe preserved values.
    expect(call.update).not.toHaveProperty("timezone");
    expect(call.update).not.toHaveProperty("defaultDurationMinutes");
  });

  it("returns the updated row on subsequent calls", async () => {
    const updated = makeDbSettings({
      name: "Renombrada",
      timezone: "America/Argentina/Cordoba",
    });
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(updated);

    const result = await upsertSettings(ORG_ID, {
      name: "Renombrada",
      timezone: "America/Argentina/Cordoba",
    });

    expect(result.name).toBe("Renombrada");
    expect(result.timezone).toBe("America/Argentina/Cordoba");
  });

  it("accepts a multi-section update (business + booking + cancellation)", async () => {
    const updated = makeDbSettings({
      name: "Clinica",
      defaultDurationMinutes: 60,
      cancellationEnabled: false,
    });
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(updated);

    await upsertSettings(ORG_ID, {
      name: "Clinica",
      defaultDurationMinutes: 60,
      cancellationEnabled: false,
    });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).toEqual({
      name: "Clinica",
      defaultDurationMinutes: 60,
      cancellationEnabled: false,
    });
  });

  it("preserves null values for optional fields (description, address, phone, email) when caller explicitly sets them", async () => {
    const cleared = makeDbSettings({ description: null });
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(cleared);

    await upsertSettings(ORG_ID, { description: null });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    // The caller is allowed to clear an optional field by sending null.
    expect(call.update).toHaveProperty("description", null);
  });
});

// ---------------------------------------------------------------------------
// `upsertSettings` — tenant scoping
// ---------------------------------------------------------------------------

describe("upsertSettings — tenant scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("always scopes to the caller-provided orgId in `where`", async () => {
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(
      makeDbSettings({ organizationId: OTHER_ORG_ID }),
    );

    await upsertSettings(OTHER_ORG_ID, { name: "X" });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      where: { organizationId: string };
    };
    expect(call.where.organizationId).toBe(OTHER_ORG_ID);
  });

  it("does not leak updates across orgs", async () => {
    prismaMock.organizationSettings.upsert.mockResolvedValueOnce(
      makeDbSettings({ organizationId: ORG_ID }),
    );

    await upsertSettings(ORG_ID, { name: "A" });

    const call = prismaMock.organizationSettings.upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
    };
    expect(call.create["organizationId"]).toBe(ORG_ID);
  });
});
