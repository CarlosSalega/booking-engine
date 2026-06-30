/**
 * Settings domain — public barrel.
 *
 * Re-exports the constants (defaults) and the Zod 4 schemas + inferred
 * types. The data layer re-validates rows against `organizationSettingsSchema`
 * and uses `SETTINGS_DEFAULTS` to populate missing fields on first write.
 *
 * Consumers should import from `@/modules/settings/domain` (or via the
 * module barrel `@/modules/settings`).
 */

export * from "./constants";
export * from "./settings.schema";
