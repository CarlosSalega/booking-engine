/**
 * Payments Server Actions — shared types.
 *
 * The discriminated `PaymentResult<T>` mirrors the `PatientResult<T>`
 * and `ServiceResult<T>` patterns from the sibling modules but lives
 * locally to avoid cross-module coupling. Each action returns either
 * `{ success: true, data: T }` (typed payload) or
 * `{ success: false, error: string }` (a user-facing Spanish error).
 *
 * Action input types are inferred from the Zod schemas in
 * `payment-actions.schema.ts` via `z.infer` — keeping the schema as the
 * single source of truth for what the action accepts.
 */

import type { z } from "zod";

import type { EnrichedPayment } from "../data/payment-data.types";

import type { retryPaymentSchema } from "./payment-actions.schema";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 */
export type PaymentSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };

/** Error branch — caller narrows via `result.success === false`. */
export type PaymentError = { success: false; error: string };

/**
 * Discriminated result of every payments Server Action.
 *
 * Use a `switch (result.success)` in the consumer to narrow the union
 * and access either `data` (on success) or `error` (on failure). The
 * `data` type defaults to `void` for actions that don't return a
 * payload; `retryPayment` uses `EnrichedPayment` as its data type.
 */
export type PaymentResult<T = void> = PaymentSuccess<T> | PaymentError;

// ---------------------------------------------------------------------------
// Input types — inferred from the Zod schemas.
// ---------------------------------------------------------------------------

/** Input for `retryPayment`. */
export type RetryPaymentInput = z.infer<typeof retryPaymentSchema>;

/**
 * Convenience type for the specific result shape of `retryPayment`.
 * Equivalent to `PaymentResult<EnrichedPayment>`.
 */
export type RetryPaymentResult = PaymentResult<EnrichedPayment>;
