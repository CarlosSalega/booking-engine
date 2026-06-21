/**
 * Bookings Server Actions — Zod 4 input schemas.
 *
 * The schemas are the single source of truth for what each Server Action
 * accepts. The action files `safeParse` against them and the input
 * types are inferred via `z.infer` (see `booking-actions.types.ts`).
 *
 * Conventions:
 * - Zod 4 syntax: `z.uuid()` / `z.email()` (top-level validators), and
 *   the `error` parameter on every constraint (not the Zod 3 `message`).
 * - Every error message is in Spanish — the action returns these
 *   directly to the UI.
 * - UUIDs use `z.uuid()` (not `z.string().uuid()`) per Zod 4.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// createBookingSchema — full payload with optional guest fields.
// ---------------------------------------------------------------------------

/**
 * Input for `createBooking`.
 *
 * - `professionalId`, `serviceId`, `startTime` are required.
 * - `patientId` is optional (guest checkout is supported).
 * - Guest contact info (`guestName`, `guestPhone`, `guestEmail`) is
 *   optional at the schema level; the action enforces that at least
 *   one of (patientId) OR (guestName + guestPhone) is present.
 * - `notes` is optional and capped at 1000 characters.
 */
export const createBookingSchema = z.object({
  professionalId: z.uuid({ error: "ID de profesional inválido" }),
  serviceId: z.uuid({ error: "ID de servicio inválido" }),
  startTime: z.date({ error: "Fecha de inicio inválida" }),
  patientId: z
    .uuid({ error: "ID de paciente inválido" })
    .optional(),
  guestName: z
    .string()
    .min(1, { error: "El nombre del invitado es obligatorio" })
    .max(100, { error: "El nombre debe tener máximo 100 caracteres" })
    .optional(),
  guestPhone: z
    .string()
    .min(1, { error: "El teléfono es obligatorio" })
    .max(50, { error: "El teléfono debe tener máximo 50 caracteres" })
    .optional(),
  guestEmail: z
    .email({ error: "Email inválido" })
    .optional(),
  notes: z
    .string()
    .max(1000, { error: "Las notas deben tener máximo 1000 caracteres" })
    .optional(),
});

// ---------------------------------------------------------------------------
// confirmBookingSchema — minimal payload for state transitions.
// ---------------------------------------------------------------------------

/** Input for `confirmBooking` — booking id only. */
export const confirmBookingSchema = z.object({
  bookingId: z.uuid({ error: "ID de turno inválido" }),
});

// ---------------------------------------------------------------------------
// cancelBookingSchema — booking id + optional reason.
// ---------------------------------------------------------------------------

/** Input for `cancelBooking` — reason is optional. */
export const cancelBookingSchema = z.object({
  bookingId: z.uuid({ error: "ID de turno inválido" }),
  reason: z
    .string()
    .max(500, { error: "El motivo debe tener máximo 500 caracteres" })
    .optional(),
});

// ---------------------------------------------------------------------------
// completeBookingSchema — minimal payload.
// ---------------------------------------------------------------------------

/** Input for `completeBooking` — booking id only. */
export const completeBookingSchema = z.object({
  bookingId: z.uuid({ error: "ID de turno inválido" }),
});

// ---------------------------------------------------------------------------
// markNoShowSchema — minimal payload.
// ---------------------------------------------------------------------------

/** Input for `markNoShow` — booking id only. */
export const markNoShowSchema = z.object({
  bookingId: z.uuid({ error: "ID de turno inválido" }),
});

// ---------------------------------------------------------------------------
// rescheduleBookingSchema — booking id + new start time.
// ---------------------------------------------------------------------------

/** Input for `rescheduleBooking` — endTime is computed from service duration. */
export const rescheduleBookingSchema = z.object({
  bookingId: z.uuid({ error: "ID de turno inválido" }),
  newStartTime: z.date({ error: "Nueva fecha de inicio inválida" }),
});
