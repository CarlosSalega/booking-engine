/**
 * Patients Server Actions — Zod 4 input schemas.
 *
 * The schemas are the single source of truth for what each Server Action
 * accepts. The action files `safeParse` against them and the input types
 * are inferred via `z.infer` (see `patient-actions.types.ts`).
 *
 * Conventions:
 * - Zod 4 syntax: `z.uuid()` / `z.email()` (top-level validators), and
 *   the `error` parameter on every constraint (not the Zod 3 `message`).
 * - Every error message is in Spanish — the action returns these
 *   directly to the UI.
 * - UUIDs use `z.uuid()` (not `z.string().uuid()`) per Zod 4.
 * - `email` is REQUIRED in the create/update schema because the
 *   underlying `User.email` column is `NOT NULL UNIQUE` (Better Auth).
 *   The domain `patientDataSchema` treats it as optional for legacy
 *   reasons, but the action and data layer enforce it.
 */

import { z } from "zod";

import { PatientStatus } from "../domain/patient";

// ---------------------------------------------------------------------------
// createPatientSchema — full payload for creating a new patient.
// ---------------------------------------------------------------------------

/**
 * Input for `createPatient`.
 *
 * - `fullName` is required (min 1 char, max 100).
 * - `email` is required and must be a valid email format.
 *   (Better Auth's `User.email` is `NOT NULL UNIQUE`.)
 * - `phone` is optional; matches the existing patient phone regex.
 * - `documentId` is optional; matches the existing 7-8 digit regex.
 * - `status` is required and must be a valid PatientStatus enum value.
 * - `notes` is optional and capped at 1000 characters.
 */
export const createPatientSchema = z.object({
  fullName: z
    .string()
    .min(1, { error: "El nombre es requerido" })
    .max(100, { error: "El nombre debe tener máximo 100 caracteres" }),
  email: z.email({ error: "Email inválido" }),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]{6,20}$/, { error: "Teléfono inválido" })
    .optional(),
  documentId: z
    .string()
    .regex(/^\d{7,8}$/, {
      error: "El DNI debe tener 7-8 dígitos sin separadores",
    })
    .optional(),
  status: z.enum(
    [PatientStatus.ACTIVE, PatientStatus.INACTIVE, PatientStatus.BLOCKED],
    { error: "Estado del paciente inválido" },
  ),
  notes: z
    .string()
    .max(1000, { error: "Las notas deben tener máximo 1000 caracteres" })
    .optional(),
});

// ---------------------------------------------------------------------------
// updatePatientSchema — id + optional fields for partial updates.
// ---------------------------------------------------------------------------

/**
 * Input for `updatePatient`.
 *
 * - `id` is required (UUID).
 * - All other fields are optional — only the provided ones are updated.
 * - At least one field besides `id` SHOULD be provided (the data layer
 *   will perform a no-op `tx.patient.update` if nothing is set, which
 *   is harmless but wasteful — caller is expected to validate this
 *   UX concern in the form).
 */
export const updatePatientSchema = z.object({
  id: z.uuid({ error: "ID de paciente inválido" }),
  fullName: z
    .string()
    .min(1, { error: "El nombre es requerido" })
    .max(100, { error: "El nombre debe tener máximo 100 caracteres" })
    .optional(),
  email: z.email({ error: "Email inválido" }).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]{6,20}$/, { error: "Teléfono inválido" })
    .optional(),
  documentId: z
    .string()
    .regex(/^\d{7,8}$/, {
      error: "El DNI debe tener 7-8 dígitos sin separadores",
    })
    .optional(),
  status: z
    .enum(
      [PatientStatus.ACTIVE, PatientStatus.INACTIVE, PatientStatus.BLOCKED],
      { error: "Estado del paciente inválido" },
    )
    .optional(),
  notes: z
    .string()
    .max(1000, { error: "Las notas deben tener máximo 1000 caracteres" })
    .optional(),
});

// ---------------------------------------------------------------------------
// changePatientStatusSchema — minimal payload for status transitions.
// ---------------------------------------------------------------------------

/**
 * Input for `changePatientStatus`.
 *
 * - `id` is required (UUID).
 * - `status` is required and must be a valid PatientStatus enum value.
 *   No state machine — any transition is allowed.
 */
export const changePatientStatusSchema = z.object({
  id: z.uuid({ error: "ID de paciente inválido" }),
  status: z.enum(
    [PatientStatus.ACTIVE, PatientStatus.INACTIVE, PatientStatus.BLOCKED],
    { error: "Estado del paciente inválido" },
  ),
});
