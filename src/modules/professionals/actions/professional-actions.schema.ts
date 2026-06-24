/**
 * Professionals Server Actions — Zod 4 input schemas.
 *
 * The schemas are the single source of truth for what each Server Action
 * accepts. The action files `safeParse` against them and the input types
 * are inferred via `z.infer` (see `professional-actions.types.ts`).
 *
 * Conventions:
 * - Zod 4 syntax: `z.uuid()` / `z.email()` (top-level validators), and
 *   the `error` parameter on every constraint (not the Zod 3 `message`).
 * - Every error message is in Spanish — the action returns these
 *   directly to the UI.
 * - UUIDs use `z.uuid()` (not `z.string().uuid()`) per Zod 4.
 * - The fields mirror the domain `professionalSchema` (fullName,
 *   email, specialties, license, bio, status) plus an `id` for updates.
 */

import { z } from "zod";

import { ProfessionalStatus } from "../domain/professional";

// ---------------------------------------------------------------------------
// Spanish error messages — single source of truth for the action layer.
// ---------------------------------------------------------------------------

const MSG = {
  // fullName
  fullNameRequired: "Full name must be 1-100 characters",
  fullNameMax: "Full name must be 1-100 characters",
  // email
  emailInvalid: "Invalid email format",
  // specialties
  specialtiesMin: "At least one specialty is required",
  specialtiesMax: "Maximum 10 specialties",
  // license
  licenseMax: "License max 50 characters",
  // bio
  bioMax: "Bio max 1000 characters",
  // status
  statusInvalid: "Invalid status",
  // ids
  professionalIdInvalid: "ID de profesional inválido",
} as const;

// ---------------------------------------------------------------------------
// specialtiesSchema — the input shape for the `specialties` array.
// Mirrors the domain constraint: 1–10 items, each 1–100 chars.
// ---------------------------------------------------------------------------

/**
 * Array of specialties the professional practices. The action accepts the
 * same shape as the domain `professionalSchema` (1–10 items, 1–100 chars
 * each) so the caller's input can be passed through unchanged.
 */
export const actionSpecialtiesSchema = z
  .array(
    z
      .string()
      .min(1, { error: MSG.fullNameRequired })
      .max(100, { error: MSG.fullNameMax }),
  )
  .min(1, { error: MSG.specialtiesMin })
  .max(10, { error: MSG.specialtiesMax });

// ---------------------------------------------------------------------------
// createProfessionalSchema — full payload for creating a new professional.
// ---------------------------------------------------------------------------

/**
 * Input for `createProfessional`.
 *
 * - `fullName` is required (min 1 char, max 100).
 * - `email` is required and must be a valid email.
 * - `specialties` is required (1–10 items).
 * - `license` is optional; max 50 chars.
 * - `bio` is optional; max 1000 chars.
 * - `status` is required; ACTIVE or INACTIVE.
 *
 * `organizationId`, `userId`, and timestamps are NOT in the schema — the
 * action injects `organizationId` from the session and the data layer
 * creates the `userId` via `$transaction`.
 */
export const createProfessionalSchema = z.object({
  fullName: z
    .string()
    .min(1, { error: MSG.fullNameRequired })
    .max(100, { error: MSG.fullNameMax }),
  email: z.email({ error: MSG.emailInvalid }),
  specialties: actionSpecialtiesSchema,
  license: z.string().max(50, { error: MSG.licenseMax }).optional(),
  bio: z.string().max(1000, { error: MSG.bioMax }).optional(),
  status: z.enum([ProfessionalStatus.ACTIVE, ProfessionalStatus.INACTIVE], {
    error: MSG.statusInvalid,
  }),
});

// ---------------------------------------------------------------------------
// updateProfessionalSchema — id + optional fields for partial updates.
// ---------------------------------------------------------------------------

/**
 * Input for `updateProfessional`.
 *
 * - `id` is required (UUID).
 * - All other fields are optional — only the provided ones are updated.
 *   `license` and `bio` accept `null` to clear the stored value; the
 *   data layer maps `null` → `null` and `undefined` → "do not touch".
 */
export const updateProfessionalSchema = z.object({
  id: z.uuid({ error: MSG.professionalIdInvalid }),
  fullName: z
    .string()
    .min(1, { error: MSG.fullNameRequired })
    .max(100, { error: MSG.fullNameMax })
    .optional(),
  email: z.email({ error: MSG.emailInvalid }).optional(),
  specialties: actionSpecialtiesSchema.optional(),
  license: z.string().max(50, { error: MSG.licenseMax }).nullable().optional(),
  bio: z.string().max(1000, { error: MSG.bioMax }).nullable().optional(),
  status: z
    .enum([ProfessionalStatus.ACTIVE, ProfessionalStatus.INACTIVE], {
      error: MSG.statusInvalid,
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// changeProfessionalStatusSchema — minimal payload for status transitions.
// ---------------------------------------------------------------------------

/**
 * Input for `changeProfessionalStatus`.
 *
 * - `id` is required (UUID).
 * - `status` is required; ACTIVE or INACTIVE. No state machine — any
 *   transition is valid (see design.md AD4).
 */
export const changeProfessionalStatusSchema = z.object({
  id: z.uuid({ error: MSG.professionalIdInvalid }),
  status: z.enum([ProfessionalStatus.ACTIVE, ProfessionalStatus.INACTIVE], {
    error: MSG.statusInvalid,
  }),
});
