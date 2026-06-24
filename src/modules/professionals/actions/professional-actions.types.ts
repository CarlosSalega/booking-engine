/**
 * Professionals Server Actions — shared types.
 *
 * The discriminated `ProfessionalResult<T>` mirrors the `ServiceResult<T>`
 * pattern from the services module but lives locally to avoid cross-module
 * coupling. Each action returns either `{ success: true, data: T }` (typed
 * payload) or `{ success: false, error: string }` (a user-facing Spanish
 * error).
 *
 * Action input types are inferred from the Zod schemas in
 * `professional-actions.schema.ts` via `z.infer` — keeping the schema as
 * the single source of truth for what the action accepts.
 */

import type { z } from "zod";

import type {
  changeProfessionalStatusSchema,
  createProfessionalSchema,
  updateProfessionalSchema,
} from "./professional-actions.schema";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 *
 * When `T` is `void` (the default for actions that don't return a
 * payload — `updateProfessional`, `changeProfessionalStatus`) the `data`
 * key is omitted so the caller can write `return { success: true }`
 * without a `data: void` type error. When `T` is anything else, `data`
 * is required.
 */
export type ProfessionalSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };

/** Error branch — caller narrows via `result.success === false`. */
export type ProfessionalError = { success: false; error: string };

/**
 * Discriminated result of every professionals Server Action.
 *
 * Use a `switch (result.success)` in the consumer to narrow the union
 * and access either `data` (on success) or `error` (on failure). The
 * `data` type defaults to `void` for actions that don't return a
 * payload (e.g. `updateProfessional`, `changeProfessionalStatus`).
 */
export type ProfessionalResult<T = void> =
  | ProfessionalSuccess<T>
  | ProfessionalError;

// ---------------------------------------------------------------------------
// Input types — inferred from the Zod schemas.
// ---------------------------------------------------------------------------

/** Input for `createProfessional`. */
export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;

/** Input for `updateProfessional`. */
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;

/** Input for `changeProfessionalStatus`. */
export type ChangeProfessionalStatusInput = z.infer<
  typeof changeProfessionalStatusSchema
>;
