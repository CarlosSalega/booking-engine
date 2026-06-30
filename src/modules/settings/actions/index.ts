/**
 * Settings module — actions barrel.
 *
 * Re-exports the three Server Actions, the Zod 4 input schemas, and
 * the shared `SettingsResult<T>` discriminated union. Consumers should
 * import from `@/modules/settings/actions` (or via the settings module
 * barrel) rather than reaching into individual files.
 *
 * Server Actions (`updateBusiness`, `updateBookings`,
 * `updateCancellations`) are tagged `"use server"` and can be imported
 * from Client Components (the presentation tabs in PR #4 and PR #5).
 *
 * Note: the action-level `updateSettingsSchema` (composed partial of
 * all three sections, with Spanish errors) is NOT re-exported here —
 * the domain barrel already exports a `updateSettingsSchema` (English
 * errors) under the same name, and the module barrel re-exports the
 * domain version. The action version is still available by importing
 * directly from `@/modules/settings/actions/settings-actions.schema`
 * for any future "all-in-one save" form that needs the Spanish-error
 * variant.
 */

export {
  updateBookingsSchema,
  updateBusinessSchema,
  updateCancellationsSchema,
} from "./settings-actions.schema";

export type {
  SettingsError,
  SettingsResult,
  SettingsSuccess,
  UpdateBookingsInput,
  UpdateBusinessInput,
  UpdateCancellationsInput,
} from "./settings-actions.types";

export { updateBookings } from "./update-settings.action";
export { updateBusiness } from "./update-settings.action";
export { updateCancellations } from "./update-settings.action";
