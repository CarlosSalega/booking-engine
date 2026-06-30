/**
 * Settings domain tests.
 *
 * Covers the Zod 4 source of truth for `OrganizationSettings`:
 *  - `SETTINGS_DEFAULTS` constant — every field matches the spec.
 *  - `organizationSettingsSchema` — full row (id, organizationId, timestamps).
 *  - `businessConfigSchema` — partial business identity (uses `.strip()`).
 *  - `bookingConfigSchema` — partial booking rules (uses `.strip()`).
 *  - `cancellationConfigSchema` — partial cancellation rules (uses `.strip()`).
 *  - `updateSettingsSchema` — composed partial of all three, `.strict()`
 *    so unknown keys are rejected.
 *
 * The domain is pure: no React, no Next.js, no Prisma. Tests run with
 * vitest globals enabled.
 */

import { describe, expect, it } from "vitest";

import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsDefaults } from "../constants";
import {
  bookingConfigSchema,
  businessConfigSchema,
  cancellationConfigSchema,
  organizationSettingsSchema,
  updateSettingsSchema,
} from "../settings.schema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const VALID_ORG_ID = "22222222-2222-4222-8222-222222222222";

function makeValidFullSettings(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: VALID_ID,
    organizationId: VALID_ORG_ID,
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SETTINGS_DEFAULTS — the spec requires every default to live here.
// ---------------------------------------------------------------------------

describe("SETTINGS_DEFAULTS", () => {
  it("matches the spec table (all 13 field defaults)", () => {
    // Structural — these literals come straight from the settings-domain
    // spec; if any default drifts, the test fails immediately.
    const expected: SettingsDefaults = {
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
    };

    expect(SETTINGS_DEFAULTS).toEqual(expected);
  });

  it("exposes 12 keys (one per OrganizationSettings column with a default — excludes id, organizationId, createdAt, updatedAt)", () => {
    // The 13 typed columns on the model include `organizationId`, but
    // `organizationId` is a runtime value (session-scoped) — it is NOT
    // a "default" in SETTINGS_DEFAULTS. The other 12 columns all have
    // a meaningful default.
    expect(Object.keys(SETTINGS_DEFAULTS)).toHaveLength(12);
  });

  it("defaults the booking constraints (spec scenario: default booking config)", () => {
    expect(SETTINGS_DEFAULTS.defaultDurationMinutes).toBe(30);
    expect(SETTINGS_DEFAULTS.minAdvanceBookingHours).toBe(1);
    expect(SETTINGS_DEFAULTS.maxBookingsPerDay).toBe(50);
    expect(SETTINGS_DEFAULTS.bufferMinutes).toBe(0);
  });

  it("defaults the timezone to Argentina (spec scenario: default timezone)", () => {
    expect(SETTINGS_DEFAULTS.timezone).toBe("America/Argentina/Buenos_Aires");
  });

  it("defaults cancellationEnabled to true and limit to 24 hours", () => {
    expect(SETTINGS_DEFAULTS.cancellationEnabled).toBe(true);
    expect(SETTINGS_DEFAULTS.cancellationLimitHours).toBe(24);
  });

  it("uses null for optional string fields (description, address, phone, email)", () => {
    // Optional fields default to null in the DB and to null in the
    // SETTINGS_DEFAULTS payload. The Zod schema treats them as optional.
    expect(SETTINGS_DEFAULTS.description).toBeNull();
    expect(SETTINGS_DEFAULTS.address).toBeNull();
    expect(SETTINGS_DEFAULTS.phone).toBeNull();
    expect(SETTINGS_DEFAULTS.email).toBeNull();
  });

  it("exposes an empty string default for name (required field)", () => {
    // The Prisma column is NOT NULL with default ''. The Zod schema
    // re-validates it on read/write.
    expect(SETTINGS_DEFAULTS.name).toBe("");
  });
});

// ---------------------------------------------------------------------------
// organizationSettingsSchema — full entity (id + organizationId + timestamps).
// ---------------------------------------------------------------------------

describe("organizationSettingsSchema", () => {
  it("accepts a complete, valid settings row (spec scenario: valid full settings)", () => {
    const result = organizationSettingsSchema.safeParse(makeValidFullSettings());
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID for id", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ id: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an invalid UUID for organizationId", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ organizationId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 1 character (empty string)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ name: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a name longer than 100 characters", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ name: "a".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a description longer than 500 characters", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ description: "a".repeat(501) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an address longer than 200 characters", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ address: "a".repeat(201) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty timezone (spec scenario: rejects missing timezone)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ timezone: "" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("timezone")),
      ).toBe(true);
    }
  });

  it("rejects a malformed email (spec scenario: invalid email rejected)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ email: "bad" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(
        true,
      );
    }
  });

  it("accepts a missing email (optional field)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ email: undefined }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects defaultDurationMinutes below 5 (spec scenario: rejects negative duration)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ defaultDurationMinutes: 4 }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path.includes("defaultDurationMinutes"),
        ),
      ).toBe(true);
    }
  });

  it("rejects defaultDurationMinutes above 480", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ defaultDurationMinutes: 481 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects minAdvanceBookingHours below 0", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ minAdvanceBookingHours: -1 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects minAdvanceBookingHours above 168", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ minAdvanceBookingHours: 169 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects maxBookingsPerDay below 1", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ maxBookingsPerDay: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects maxBookingsPerDay above 200", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ maxBookingsPerDay: 201 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects bufferMinutes below 0", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ bufferMinutes: -1 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects bufferMinutes above 120", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ bufferMinutes: 121 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects cancellationLimitHours below 0", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ cancellationLimitHours: -1 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects cancellationLimitHours above 168", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ cancellationLimitHours: 169 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer defaultDurationMinutes", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ defaultDurationMinutes: 30.5 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts the boundary defaultDurationMinutes=5 (lower bound)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ defaultDurationMinutes: 5 }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts the boundary defaultDurationMinutes=480 (upper bound)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ defaultDurationMinutes: 480 }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a non-boolean cancellationEnabled as a failure (must be boolean)", () => {
    const result = organizationSettingsSchema.safeParse(
      makeValidFullSettings({ cancellationEnabled: "yes" as unknown as boolean }),
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// businessConfigSchema — partial business identity. Uses .strip() so any
// unknown field is silently dropped (for section-level updates).
// ---------------------------------------------------------------------------

describe("businessConfigSchema", () => {
  it("accepts a partial business update with only `name`", () => {
    const result = businessConfigSchema.safeParse({ name: "Nueva Clínica" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (all fields are optional in section update)", () => {
    const result = businessConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("strips unknown keys silently (per-section schemas use .strip())", () => {
    const result = businessConfigSchema.safeParse({
      name: "OK",
      unknownField: "dropped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("unknownField");
    }
  });

  it("rejects a name that is too long", () => {
    const result = businessConfigSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = businessConfigSchema.safeParse({ email: "bad" });
    expect(result.success).toBe(false);
  });

  it("accepts null for nullable fields (clearing the value)", () => {
    const result = businessConfigSchema.safeParse({
      description: null,
      address: null,
      phone: null,
      email: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// bookingConfigSchema — partial booking rules.
// ---------------------------------------------------------------------------

describe("bookingConfigSchema", () => {
  it("accepts a valid partial booking update", () => {
    const result = bookingConfigSchema.safeParse({
      defaultDurationMinutes: 45,
      minAdvanceBookingHours: 2,
      maxBookingsPerDay: 30,
      bufferMinutes: 15,
    });
    expect(result.success).toBe(true);
  });

  it("strips unknown keys", () => {
    const result = bookingConfigSchema.safeParse({
      defaultDurationMinutes: 30,
      random: "drop",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("random");
    }
  });

  it("rejects defaultDurationMinutes below 5", () => {
    const result = bookingConfigSchema.safeParse({
      defaultDurationMinutes: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxBookingsPerDay above 200", () => {
    const result = bookingConfigSchema.safeParse({ maxBookingsPerDay: 201 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer defaultDurationMinutes", () => {
    const result = bookingConfigSchema.safeParse({
      defaultDurationMinutes: 30.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts the lower bound minAdvanceBookingHours=0 (allow same-day bookings)", () => {
    const result = bookingConfigSchema.safeParse({
      minAdvanceBookingHours: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts the upper bound bufferMinutes=120", () => {
    const result = bookingConfigSchema.safeParse({ bufferMinutes: 120 });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cancellationConfigSchema — partial cancellation rules.
// ---------------------------------------------------------------------------

describe("cancellationConfigSchema", () => {
  it("accepts a partial cancellation update", () => {
    const result = cancellationConfigSchema.safeParse({
      cancellationEnabled: false,
      cancellationLimitHours: 48,
    });
    expect(result.success).toBe(true);
  });

  it("rejects cancellationLimitHours below 0", () => {
    const result = cancellationConfigSchema.safeParse({
      cancellationLimitHours: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects cancellationLimitHours above 168 (one week)", () => {
    const result = cancellationConfigSchema.safeParse({
      cancellationLimitHours: 169,
    });
    expect(result.success).toBe(false);
  });

  it("strips unknown keys", () => {
    const result = cancellationConfigSchema.safeParse({
      cancellationEnabled: true,
      name: "dropped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("name");
    }
  });
});

// ---------------------------------------------------------------------------
// updateSettingsSchema — composed partial of all three sections. Uses
// .strict() so unknown keys FAIL (per spec scenario: unknown field rejected).
// ---------------------------------------------------------------------------

describe("updateSettingsSchema", () => {
  it("accepts an empty object (no updates)", () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a single business field (spec scenario: partial update succeeds)", () => {
    const result = updateSettingsSchema.safeParse({ name: "Nuevo Nombre" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Nuevo Nombre" });
    }
  });

  it("accepts fields from multiple sections in the same payload", () => {
    const result = updateSettingsSchema.safeParse({
      name: "Clinica",
      defaultDurationMinutes: 60,
      cancellationEnabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (spec scenario: unknown field rejected)", () => {
    const result = updateSettingsSchema.safeParse({
      name: "OK",
      unknownField: 1,
    });
    expect(result.success).toBe(false);
  });

  it("still validates fields when partial (e.g. rejects negative duration)", () => {
    const result = updateSettingsSchema.safeParse({
      defaultDurationMinutes: -5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path.includes("defaultDurationMinutes"),
        ),
      ).toBe(true);
    }
  });

  it("still validates email when partial (spec scenario: invalid email rejected)", () => {
    const result = updateSettingsSchema.safeParse({ email: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(
        true,
      );
    }
  });

  it("rejects defaultDurationMinutes below 5 (spec scenario: rejects negative duration)", () => {
    const result = updateSettingsSchema.safeParse({
      defaultDurationMinutes: -5,
    });
    expect(result.success).toBe(false);
  });
});
