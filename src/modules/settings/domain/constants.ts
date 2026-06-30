/**
 * Settings domain — default values.
 *
 * `SETTINGS_DEFAULTS` is the SINGLE SOURCE OF TRUTH for the default
 * value of every column on the `OrganizationSettings` model. The Prisma
 * schema uses the same defaults at the DB level, and the data layer
 * spreads this object into `upsert` calls so the row is fully populated
 * on first write.
 *
 * `SettingsDefaults` is the inferred type — used as the source of truth
 * for default-payload shape across the data layer and tests.
 *
 * The `as const` + `typeof` pattern is the project convention (see
 * `src/modules/services/domain/service.ts` and the typescript skill).
 * It guarantees:
 *   - Immutable defaults at runtime (callers cannot mutate them).
 *   - The narrowest possible type for the values (e.g. `30` not `number`).
 *   - A single declared place for every default.
 *
 * Spec source: `openspec/changes/settings/specs/settings-domain/spec.md`
 * — 13 columns (everything except `id`, `createdAt`, `updatedAt`).
 */

export const SETTINGS_DEFAULTS = {
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
} as const;

export type SettingsDefaults = typeof SETTINGS_DEFAULTS;
