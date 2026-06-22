/**
 * Patients Server Actions — shared types.
 *
 * The discriminated `PatientResult<T>` mirrors the `BookingResult<T>`
 * pattern from the bookings module but lives locally to avoid
 * cross-module coupling. Each action returns either
 * `{ success: true, data: T }` (typed payload) or
 * `{ success: false, error: string }` (a user-facing Spanish error).
 *
 * Action input types are inferred from the Zod schemas in
 * `patient-actions.schema.ts` via `z.infer` — keeping the schema as the
 * single source of truth for what the action accepts.
 */

import type { z } from "zod";

import type {
  changePatientStatusSchema,
  createPatientSchema,
  updatePatientSchema,
} from "./patient-actions.schema";

// ---------------------------------------------------------------------------
// Result type — discriminated union (success / error).
// ---------------------------------------------------------------------------

/**
 * Success branch — caller narrows via `result.success === true`.
 *
 * When `T` is `void` (the default for actions that don't return a
 * payload — `updatePatient`, `changePatientStatus`) the `data` key is
 * omitted so the caller can write `return { success: true }` without a
 * `data: void` type error. When `T` is anything else, `data` is
 * required.
 */
export type PatientSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };

/** Error branch — caller narrows via `result.success === false`. */
export type PatientError = { success: false; error: string };

/**
 * Discriminated result of every patients Server Action.
 *
 * Use a `switch (result.success)` in the consumer to narrow the union
 * and access either `data` (on success) or `error` (on failure). The
 * `data` type defaults to `void` for actions that don't return a
 * payload (e.g. `updatePatient`).
 */
export type PatientResult<T = void> = PatientSuccess<T> | PatientError;

// ---------------------------------------------------------------------------
// Input types — inferred from the Zod schemas.
// ---------------------------------------------------------------------------

/** Input for `createPatient`. */
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

/** Input for `updatePatient`. */
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

/** Input for `changePatientStatus`. */
export type ChangeStatusInput = z.infer<typeof changePatientStatusSchema>;
