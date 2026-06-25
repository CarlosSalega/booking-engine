/**
 * Payments Server Actions — Zod 4 input schemas.
 *
 * The schemas are the single source of truth for what each Server Action
 * accepts. The action files `safeParse` against them and the input types
 * are inferred via `z.infer` (see `payment-actions.types.ts`).
 *
 * Conventions:
 * - Zod 4 syntax: `z.uuid({ error: "..." })` (top-level validator) for
 *   UUIDs — matches the project-wide pattern from `patient-actions.schema.ts`.
 * - Every error message is in Spanish — the action returns these
 *   directly to the UI.
 */

import { z } from "zod";

/**
 * Input for `retryPayment`.
 *
 * - `paymentId` is required (UUID, es-AR error message on failure).
 *   The name is `paymentId` (not the generic `id`) so callers reading
 *   the call site know they are passing a Payment's id, not e.g. a
 *   Booking's id.
 */
export const retryPaymentSchema = z.object({
  paymentId: z.uuid({ error: "ID de pago inválido" }),
});
