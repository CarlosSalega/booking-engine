/**
 * Settings domain — Zod 4 schemas.
 *
 * Source of truth for validating `OrganizationSettings`. The Prisma
 * model and the data layer mirror these constraints; the action layer
 * re-validates input against `updateSettingsSchema` before persisting.
 *
 * Schemas (see `openspec/changes/settings/specs/settings-domain/spec.md`):
 *  - `organizationSettingsSchema` — full row, including `id`,
 *    `organizationId`, `createdAt`, `updatedAt`. Used on the data layer
 *    to validate the read path.
 *  - `businessConfigSchema` — partial business identity. Uses `.strip()`
 *    so unknown keys are silently dropped (section-level updates
 *    forwarded by the action layer never blow up on extra payload
 *    fields).
 *  - `bookingConfigSchema` — partial booking rules. `.strip()`.
 *  - `cancellationConfigSchema` — partial cancellation rules. `.strip()`.
 *  - `updateSettingsSchema` — composed partial of all three sections.
 *    Uses `.strict()` so unknown keys FAIL (the spec requires this:
 *    silently accepting unknown keys would let callers mutate
 *    state the schema does not know about).
 *
 * All types are inferred from the schemas via `z.infer` (no hand-written
 * types in this file). The data layer's `OrganizationSettings` and
 * `OrganizationSettingsInput` types are the persisted-shape versions
 * of these inferred types.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Reusable: a non-empty timezone string. The spec requires a value. */
const timezoneSchema = z
  .string()
  .min(1, { error: "Timezone required" });

/** Reusable: optional email that, when present, must be RFC-valid. */
const optionalEmailSchema = z
  .email({ error: "Invalid email" })
  .nullish();

/** Reusable: optional phone that, when present, must be 6-20 chars of basic digits, spaces, +, -, (, ). */
const optionalPhoneSchema = z
  .string()
  .regex(/^[+0-9\s().-]{6,20}$/, { error: "Invalid phone format" })
  .nullish();

// ---------------------------------------------------------------------------
// Full row — `organizationSettingsSchema` (matches the Prisma shape).
// ---------------------------------------------------------------------------

export const organizationSettingsSchema = z.object({
  id: z.uuid({ error: "Invalid id UUID" }),
  organizationId: z.uuid({ error: "Invalid organizationId UUID" }),
  name: z
    .string()
    .min(1, { error: "Name must be 1-100 characters" })
    .max(100, { error: "Name must be 1-100 characters" }),
  description: z
    .string()
    .max(500, { error: "Description max 500 characters" })
    .nullish(),
  address: z
    .string()
    .max(200, { error: "Address max 200 characters" })
    .nullish(),
  timezone: timezoneSchema,
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  defaultDurationMinutes: z
    .number()
    .int()
    .min(5, { error: "Must be 5–480" })
    .max(480, { error: "Must be 5–480" }),
  minAdvanceBookingHours: z
    .number()
    .int()
    .min(0, { error: "Must be 0–168" })
    .max(168, { error: "Must be 0–168" }),
  maxBookingsPerDay: z
    .number()
    .int()
    .min(1, { error: "Must be 1–200" })
    .max(200, { error: "Must be 1–200" }),
  bufferMinutes: z
    .number()
    .int()
    .min(0, { error: "Must be 0–120" })
    .max(120, { error: "Must be 0–120" }),
  cancellationEnabled: z.boolean(),
  cancellationLimitHours: z
    .number()
    .int()
    .min(0, { error: "Must be 0–168" })
    .max(168, { error: "Must be 0–168" }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ---------------------------------------------------------------------------
// Per-section schemas — partial updates. `.strip()` so unknown keys are
// dropped silently (forward-compat with extra payload fields).
// ---------------------------------------------------------------------------

export const businessConfigSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: "Name must be 1-100 characters" })
      .max(100, { error: "Name must be 1-100 characters" })
      .optional(),
    description: z
      .string()
      .max(500, { error: "Description max 500 characters" })
      .nullish(),
    address: z
      .string()
      .max(200, { error: "Address max 200 characters" })
      .nullish(),
    timezone: timezoneSchema.optional(),
    phone: optionalPhoneSchema,
    email: optionalEmailSchema,
  })
  .strip();

export const bookingConfigSchema = z
  .object({
    defaultDurationMinutes: z
      .number()
      .int()
      .min(5, { error: "Must be 5–480" })
      .max(480, { error: "Must be 5–480" })
      .optional(),
    minAdvanceBookingHours: z
      .number()
      .int()
      .min(0, { error: "Must be 0–168" })
      .max(168, { error: "Must be 0–168" })
      .optional(),
    maxBookingsPerDay: z
      .number()
      .int()
      .min(1, { error: "Must be 1–200" })
      .max(200, { error: "Must be 1–200" })
      .optional(),
    bufferMinutes: z
      .number()
      .int()
      .min(0, { error: "Must be 0–120" })
      .max(120, { error: "Must be 0–120" })
      .optional(),
  })
  .strip();

export const cancellationConfigSchema = z
  .object({
    cancellationEnabled: z.boolean().optional(),
    cancellationLimitHours: z
      .number()
      .int()
      .min(0, { error: "Must be 0–168" })
      .max(168, { error: "Must be 0–168" })
      .optional(),
  })
  .strip();

// ---------------------------------------------------------------------------
// Composed update schema — partial of all three sections. `.strict()` so
// unknown keys FAIL (spec: "Unknown field rejected"). The action layer
// uses this for defense-in-depth validation before persisting.
// ---------------------------------------------------------------------------

export const updateSettingsSchema = businessConfigSchema
  .merge(bookingConfigSchema)
  .merge(cancellationConfigSchema)
  .strict();

// ---------------------------------------------------------------------------
// Inferred types — the Zod schema is the single source of truth.
// ---------------------------------------------------------------------------

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;
export type BusinessConfig = z.infer<typeof businessConfigSchema>;
export type BookingConfig = z.infer<typeof bookingConfigSchema>;
export type CancellationConfig = z.infer<typeof cancellationConfigSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
