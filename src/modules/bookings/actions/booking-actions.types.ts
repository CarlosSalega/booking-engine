/**
 * Bookings Server Actions — shared types.
 *
 * The discriminated `BookingResult<T>` mirrors the `AuthResult<T>` pattern
 * from the auth module but lives locally to avoid cross-module coupling.
 * Each action returns either `{ success: true, data: T }` (typed payload)
 * or `{ success: false, error: string }` (a user-facing Spanish error).
 *
 * Action input types are inferred from the Zod schemas in
 * `booking-actions.schema.ts` via `z.infer` — keeping the schema as the
 * single source of truth for what the action accepts.
 */

import type { z } from "zod";

import type {
  cancelBookingSchema,
  completeBookingSchema,
  confirmBookingSchema,
  createBookingSchema,
  markNoShowSchema,
  rescheduleBookingSchema,
} from "./booking-actions.schema";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 *
 * When `T` is `void` (the default for actions that don't return a
 * payload — `confirmBooking`, `cancelBooking`, `completeBooking`,
 * `markNoShow`, `rescheduleBooking`) the `data` key is omitted so the
 * caller can write `return { success: true }` without a `data: void`
 * type error. When `T` is anything else, `data` is required.
 */
export type BookingSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };

/** Error branch — caller narrows via `result.success === false`. */
export type BookingError = { success: false; error: string };

/**
 * Discriminated result of every bookings Server Action.
 *
 * Use a `switch (result.success)` in the consumer to narrow the union
 * and access either `data` (on success) or `error` (on failure). The
 * `data` type defaults to `void` for actions that don't return a
 * payload (e.g. `confirmBooking`).
 */
export type BookingResult<T = void> = BookingSuccess<T> | BookingError;

// ---------------------------------------------------------------------------
// Input types — inferred from the Zod schemas.
// ---------------------------------------------------------------------------

/** Input for `createBooking`. */
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** Input for `confirmBooking`. */
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;

/** Input for `cancelBooking`. */
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/** Input for `completeBooking`. */
export type CompleteBookingInput = z.infer<typeof completeBookingSchema>;

/** Input for `markNoShow`. */
export type MarkNoShowInput = z.infer<typeof markNoShowSchema>;

/** Input for `rescheduleBooking`. */
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
