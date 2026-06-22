/**
 * Services Server Actions — shared types.
 *
 * The discriminated `ServiceResult<T>` mirrors the `PatientResult<T>`
 * pattern from the patients module but lives locally to avoid
 * cross-module coupling. Each action returns either
 * `{ success: true, data: T }` (typed payload) or
 * `{ success: false, error: string }` (a user-facing Spanish error).
 *
 * Action input types are inferred from the Zod schemas in
 * `service-actions.schema.ts` via `z.infer` — keeping the schema as the
 * single source of truth for what the action accepts.
 */

import type { z } from "zod";

import type {
  changeServiceStatusSchema,
  createServiceSchema,
  updateServiceSchema,
} from "./service-actions.schema";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 *
 * When `T` is `void` (the default for actions that don't return a
 * payload — `updateService`, `changeServiceStatus`) the `data` key is
 * omitted so the caller can write `return { success: true }` without a
 * `data: void` type error. When `T` is anything else, `data` is
 * required.
 */
export type ServiceSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };

/** Error branch — caller narrows via `result.success === false`. */
export type ServiceError = { success: false; error: string };

/**
 * Discriminated result of every services Server Action.
 *
 * Use a `switch (result.success)` in the consumer to narrow the union
 * and access either `data` (on success) or `error` (on failure). The
 * `data` type defaults to `void` for actions that don't return a
 * payload (e.g. `updateService`, `changeServiceStatus`).
 */
export type ServiceResult<T = void> = ServiceSuccess<T> | ServiceError;

// ---------------------------------------------------------------------------
// Input types — inferred from the Zod schemas.
// ---------------------------------------------------------------------------

/** Input for `createService`. */
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

/** Input for `updateService`. */
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

/** Input for `changeServiceStatus`. */
export type ChangeServiceStatusInput = z.infer<typeof changeServiceStatusSchema>;
