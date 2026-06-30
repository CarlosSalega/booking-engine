/**
 * Settings Server Actions — shared types.
 *
 * The discriminated `SettingsResult<T>` mirrors the `ServiceResult<T>`
 * pattern from the services module but lives locally to avoid
 * cross-module coupling. Each action returns either
 * `{ success: true, data: T }` (typed payload) or
 * `{ success: false, error: string }` (a user-facing Spanish error).
 *
 * Action input types are inferred from the Zod schemas in
 * `settings-actions.schema.ts` via `z.infer` — keeping the schema as
 * the single source of truth for what the action accepts.
 *
 * Conventions (mirrors `service-actions.types.ts`):
 * - `T` defaults to `void` for actions that don't return a payload
 *   (all three settings actions: `updateBusiness`, `updateBookings`,
 *   `updateCancellations`).
 * - The success branch omits `data` when `T` is `void` so callers can
 *   write `return { success: true }` without a `data: void` type error.
 */

import type { z } from "zod";

import type {
  updateBookingsSchema,
  updateBusinessSchema,
  updateCancellationsSchema,
} from "./settings-actions.schema";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 *
 * When `T` is `void` (the default for the three settings actions that
 * don't return a payload) the `data` key is omitted so the caller can
 * write `return { success: true }` without a `data: void` type error.
 * When `T` is anything else, `data` is required.
 */
export type SettingsSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };

/** Error branch — caller narrows via `result.success === false`. */
export type SettingsError = { success: false; error: string };

/**
 * Discriminated result of every settings Server Action.
 *
 * Use a `switch (result.success)` in the consumer to narrow the union
 * and access either `data` (on success) or `error` (on failure). The
 * `data` type defaults to `void` for actions that don't return a
 * payload (`updateBusiness`, `updateBookings`, `updateCancellations`).
 */
export type SettingsResult<T = void> = SettingsSuccess<T> | SettingsError;

// ---------------------------------------------------------------------------
// Input types — inferred from the Zod schemas.
// ---------------------------------------------------------------------------

/** Input for `updateBusiness` — name, description, address, timezone, phone, email. */
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

/** Input for `updateBookings` — defaultDurationMinutes, minAdvanceBookingHours, maxBookingsPerDay, bufferMinutes. */
export type UpdateBookingsInput = z.infer<typeof updateBookingsSchema>;

/** Input for `updateCancellations` — cancellationEnabled, cancellationLimitHours. */
export type UpdateCancellationsInput = z.infer<typeof updateCancellationsSchema>;
