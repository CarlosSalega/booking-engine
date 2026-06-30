/**
 * Settings Server Actions — Zod 4 input schemas.
 *
 * The schemas are the single source of truth for what each Server
 * Action accepts. The action files `safeParse` against them and the
 * input types are inferred via `z.infer` (see `settings-actions.types.ts`).
 *
 * Conventions (mirrors `service-actions.schema.ts`):
 * - Zod 4 syntax: `z.email()` (top-level validator), and the `error`
 *   parameter on every constraint (not the Zod 3 `message`).
 * - Every error message is in Spanish — the action returns these
 *   directly to the UI.
 * - The per-section schemas use `.strip()` so unknown keys are dropped
 *   silently (the form layer may add extra fields in the future).
 * - The composed `updateSettingsSchema` is `.strict()` so unknown keys
 *   FAIL (defense-in-depth: silently accepting unknown keys would let
 *   callers mutate state the schema does not know about).
 *
 * These schemas are thin re-validators of the domain schemas from
 * `src/modules/settings/domain/settings.schema.ts` — they share the
 * same constraints but with Spanish error messages that the action
 * returns verbatim to the UI.
 *
 * Spec source: `openspec/changes/settings/specs/settings-domain/spec.md`
 *   — Requirement: Validation Schemas
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Spanish error messages — single source of truth for the action layer.
// ---------------------------------------------------------------------------

const MSG = {
  // business section
  nameRequired: "El nombre es requerido",
  nameMax: "El nombre debe tener máximo 100 caracteres",
  descriptionMax: "La descripción debe tener máximo 500 caracteres",
  addressMax: "La dirección debe tener máximo 200 caracteres",
  timezoneRequired: "El timezone es requerido",
  phoneInvalid: "Formato de teléfono inválido",
  emailInvalid: "Email inválido",
  // booking section
  durationInt: "La duración debe ser un número entero",
  durationRange: "La duración debe estar entre 5 y 480 minutos",
  minAdvanceInt: "Las horas mínimas de anticipación deben ser un entero",
  minAdvanceRange: "Las horas mínimas de anticipación deben estar entre 0 y 168",
  maxBookingsInt: "El máximo de reservas por día debe ser un entero",
  maxBookingsRange: "El máximo de reservas por día debe estar entre 1 y 200",
  bufferInt: "El buffer debe ser un número entero",
  bufferRange: "El buffer debe estar entre 0 y 120 minutos",
  // cancellation section
  cancellationEnabledInvalid: "El estado de cancelación debe ser verdadero o falso",
  cancellationLimitInt: "El límite de cancelación debe ser un entero",
  cancellationLimitRange: "El límite de cancelación debe estar entre 0 y 168 horas",
} as const;

// ---------------------------------------------------------------------------
// Primitives — mirror the domain schema, with Spanish error messages.
// ---------------------------------------------------------------------------

/** Timezone — required, non-empty. */
const timezoneSchema = z
  .string()
  .min(1, { error: MSG.timezoneRequired });

/** Optional email — must be RFC-valid when present. */
const optionalEmailSchema = z
  .email({ error: MSG.emailInvalid })
  .nullish();

/** Optional phone — 6-20 chars of basic digits, spaces, +, -, (, ). */
const optionalPhoneSchema = z
  .string()
  .regex(/^[+0-9\s().-]{6,20}$/, { error: MSG.phoneInvalid })
  .nullish();

// ---------------------------------------------------------------------------
// Section schemas — partial, `.strip()` so unknown keys are dropped.
// ---------------------------------------------------------------------------

/**
 * Business section — name, description, address, timezone, phone, email.
 * All fields optional; the action does not require a full payload —
 * partial updates are valid (the data layer's `upsert` will preserve
 * the rest of the row).
 */
export const updateBusinessSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: MSG.nameRequired })
      .max(100, { error: MSG.nameMax })
      .optional(),
    description: z
      .string()
      .max(500, { error: MSG.descriptionMax })
      .nullish(),
    address: z
      .string()
      .max(200, { error: MSG.addressMax })
      .nullish(),
    timezone: timezoneSchema.optional(),
    phone: optionalPhoneSchema,
    email: optionalEmailSchema,
  })
  .strip();

/**
 * Booking section — defaultDurationMinutes (5-480), minAdvanceBookingHours
 * (0-168), maxBookingsPerDay (1-200), bufferMinutes (0-120). All fields
 * optional; partial updates are valid.
 */
export const updateBookingsSchema = z
  .object({
    defaultDurationMinutes: z
      .number()
      .int({ error: MSG.durationInt })
      .min(5, { error: MSG.durationRange })
      .max(480, { error: MSG.durationRange })
      .optional(),
    minAdvanceBookingHours: z
      .number()
      .int({ error: MSG.minAdvanceInt })
      .min(0, { error: MSG.minAdvanceRange })
      .max(168, { error: MSG.minAdvanceRange })
      .optional(),
    maxBookingsPerDay: z
      .number()
      .int({ error: MSG.maxBookingsInt })
      .min(1, { error: MSG.maxBookingsRange })
      .max(200, { error: MSG.maxBookingsRange })
      .optional(),
    bufferMinutes: z
      .number()
      .int({ error: MSG.bufferInt })
      .min(0, { error: MSG.bufferRange })
      .max(120, { error: MSG.bufferRange })
      .optional(),
  })
  .strip();

/**
 * Cancellation section — cancellationEnabled (boolean),
 * cancellationLimitHours (0-168). All fields optional; partial
 * updates are valid.
 */
export const updateCancellationsSchema = z
  .object({
    cancellationEnabled: z
      .boolean({ error: MSG.cancellationEnabledInvalid })
      .optional(),
    cancellationLimitHours: z
      .number()
      .int({ error: MSG.cancellationLimitInt })
      .min(0, { error: MSG.cancellationLimitRange })
      .max(168, { error: MSG.cancellationLimitRange })
      .optional(),
  })
  .strip();

/**
 * Composed schema — partial of all three sections. Used by the data
 * layer's `upsert` callers that forward a flat payload. `.strict()` so
 * unknown keys FAIL.
 *
 * Not used directly by the three action functions (each uses its own
 * section schema) — exported for any future action that accepts a
 * mixed payload (e.g. an "all-in-one save" form).
 */
export const updateSettingsSchema = updateBusinessSchema
  .merge(updateBookingsSchema)
  .merge(updateCancellationsSchema)
  .strict();
