/**
 * Settings module — public barrel.
 *
 * Re-exports the domain types (constants, Zod schemas, inferred types),
 * the data access layer (cached + uncached reads, single write path),
 * the three Server Actions, and the action-level result/input types.
 *
 * The data layer's `upsertSettings` is intentionally NOT re-exported
 * from this barrel because it shares the conceptual "write settings"
 * surface with the Server Actions; the actions are the public API and
 * the data-layer write function is an implementation detail used by
 * the actions themselves (mirrors the services module convention).
 *
 * Consumers should import from `@/modules/settings`:
 *   - Server Components  → `getSettings` (cached), `getByOrgId` (uncached)
 *   - Client Components  → `updateBusiness`, `updateBookings`,
 *                          `updateCancellations` (Server Actions)
 *   - Types              → `OrganizationSettings`, `SettingsResult`,
 *                          `UpdateBusinessInput`, `UpdateBookingsInput`,
 *                          `UpdateCancellationsInput`
 *   - Constants          → `SETTINGS_DEFAULTS`, `SettingsDefaults`
 *   - Schemas            → `businessConfigSchema`, `bookingConfigSchema`,
 *                          `cancellationConfigSchema`, `updateSettingsSchema`
 */

export * from "./domain";

// Re-export the data layer's public API explicitly. The write
// (`upsertSettings`) is NOT re-exported — the actions are the public
// surface, and the data write is an internal collaborator.
export {
  getByOrgId,
  getSettings,
} from "./data/settings-data";
export type {
  OrganizationSettings,
  OrganizationSettingsInput,
  SettingsRepository,
} from "./data/settings-data.types";

// Server Actions + their schemas + result/input types. The actions
// barrel already declares the same names (e.g. `updateSettingsSchema`),
// so we re-export from both with explicit `export * from` ordering to
// avoid the `TS2308: already exported` warning. The actions barrel is
// the source of truth for action-level schemas (Spanish errors); the
// domain barrel is the source of truth for the same schemas with
// English errors. Both are exposed — the module barrel prefers the
// domain's English versions, with the action's Spanish versions
// available via the action subpath.
export * from "./actions";

// Presentation — Client Components (the settings page guard + tab
// forms) and the Server Component body (`SettingsPage`). The route
// file in the App Router imports `SettingsPage` from here so the
// page entry stays a thin wrapper. Only the guard, the tab forms,
// and the RSC body are re-exported.
export {
  SettingsGuard,
  TimezoneSelect,
  TIMEZONES,
  DEFAULT_TIMEZONE,
  BusinessTab,
  BookingsTab,
  CancellationsTab,
  SettingsPage,
  type TimezoneValue,
} from "./presentation";
