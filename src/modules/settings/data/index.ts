/**
 * Settings data layer — barrel.
 *
 * Re-exports the data access functions and the public types.
 *
 * - `getByOrgId`     — uncached read (Prisma direct)
 * - `getSettings`    — cached read (`"use cache"` + `cacheTag("settings")` +
 *                      `cacheLife({ revalidate: 300 })`); invalidated by
 *                      the Server Actions via `updateTag("settings")`
 * - `upsertSettings` — single write path (create-on-first-call +
 *                      update-on-subsequent-call)
 *
 * Consumers should import from `@/modules/settings/data` (or via the
 * module barrel `@/modules/settings`).
 *
 * PR #2 adds `getSettings` (the cached wrapper) on top of the PR #1
 * foundation.
 */

export { getByOrgId, getSettings, upsertSettings } from "./settings-data";
export type {
  OrganizationSettings,
  OrganizationSettingsInput,
  SettingsRepository,
} from "./settings-data.types";
