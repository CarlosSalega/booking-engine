/**
 * Bookings presentation formatters.
 *
 * Pure, dependency-free helpers for rendering booking data in the UI.
 * The dashboard module already has its own `formatters.ts` (e.g.
 * `formatCurrency`, `formatTime`); this file is the bookings-specific
 * counterpart that:
 *
 * 1. Lives next to the bookings types so the components can import
 *    everything from one place.
 * 2. Exposes the `BOOKING_STATUS_LABEL` map (the dashboard one uses
 *    a slightly different label for `AWAITING_PAYMENT` and is not
 *    imported from here on purpose — the bookings UI uses the spec's
 *    exact label "Esperando pago").
 * 3. Adds the guest-aware `getPatientDisplayName` helper, which the
 *    dashboard's `today-bookings.tsx` cannot do (it doesn't have the
 *    full enriched booking shape).
 *
 * Pure: no React, no Next.js, no Prisma. Importable from both Server
 * and Client Components.
 */

import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { PaymentStatusType, PaymentTypeType } from "@/modules/services/domain";

const AR_LOCALE = "es-AR";
const AR_CURRENCY = "ARS";

/**
 * Prefix used in the `notes` field when a guest booking is created.
 * The createBooking action writes the guest info as
 * `"Invitado: <name> | Tel: <phone> | Email: <email>"` — the prefix
 * here is the same string used as a marker when parsing.
 */
export const GUEST_NOTES_PREFIX = "Invitado:";

// ---------------------------------------------------------------------------
// Date / time
// ---------------------------------------------------------------------------

/**
 * Formats a Date as Argentinian short date (e.g. "19/06/26").
 * Day + month are 2-digit, year is numeric. The project runs in
 * America/Argentina/Buenos_Aires (the runtime TZ in CI matches
 * production) so we don't pin a `timeZone` option — Intl uses
 * the runtime default, which is consistent across environments.
 */
export function formatBookingDate(date: Date): string {
  return new Intl.DateTimeFormat(AR_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a Date as HH:MM in 24-hour format (e.g. "10:00").
 * Does NOT include the " hs" suffix that the dashboard's `formatTime`
 * adds — the bookings list page already shows " hs" in the column
 * header, so the cell is bare time.
 */
export function formatBookingTime(date: Date): string {
  return new Intl.DateTimeFormat(AR_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * Formats a number as Argentinian pesos with up to 2 fraction digits
 * (e.g. 42500 → "$42.500,00"). Mirrors the dashboard's `formatCurrency`
 * but with 2 fraction digits to preserve the cents where relevant.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(AR_LOCALE, {
    style: "currency",
    currency: AR_CURRENCY,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Status labels — Argentinian Spanish
// ---------------------------------------------------------------------------

/**
 * Booking status → human label in Argentinian Spanish. Keys are the
 * 7 values of `BookingStatusType`. Used by the status badge and the
 * dashboard's today-bookings table (for consistency across modules).
 */
export const BOOKING_STATUS_LABEL: Record<BookingStatusType, string> = {
  [BookingStatus.PENDING]: "Pendiente",
  [BookingStatus.CONFIRMED]: "Confirmada",
  [BookingStatus.CANCELLED]: "Cancelada",
  [BookingStatus.RESCHEDULED]: "Reprogramada",
  [BookingStatus.COMPLETED]: "Completada",
  [BookingStatus.NO_SHOW]: "No asistió",
  [BookingStatus.AWAITING_PAYMENT]: "Esperando pago",
};

/**
 * Returns the Argentinian Spanish label for a booking status.
 * Falls back to the raw status string when unknown (defensive).
 */
export function getBookingStatusLabel(status: BookingStatusType): string {
  return BOOKING_STATUS_LABEL[status] ?? status;
}

// ---------------------------------------------------------------------------
// Payment labels — Argentinian Spanish
// ---------------------------------------------------------------------------

const PAYMENT_STATUS_LABEL: Record<PaymentStatusType, string> = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Parcial",
};

/**
 * Returns the Argentinian Spanish label for a payment status.
 * Falls back to the raw status string when unknown.
 */
export function formatPaymentStatus(status: PaymentStatusType): string {
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

const PAYMENT_TYPE_LABEL: Record<PaymentTypeType, string> = {
  FULL: "Pago completo",
  DEPOSIT: "Seña",
  NONE: "Sin pago",
};

/**
 * Returns the Argentinian Spanish label for a service payment type.
 * Falls back to the raw value when unknown.
 */
export function formatPaymentType(type: PaymentTypeType): string {
  return PAYMENT_TYPE_LABEL[type] ?? type;
}

// ---------------------------------------------------------------------------
// Patient display — handles guest bookings
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable name for the patient on a booking.
 *
 * - Registered patient → `patient.user.name`
 * - Guest booking (patient === null) → parses `notes` for the
 *   `Invitado: <name>` prefix; if not present, returns "Invitado".
 *
 * Format contract with `create-booking.action.ts`:
 *   `"Invitado: <name> | Tel: <phone> | Email: <email>"`
 */
export function getPatientDisplayName(booking: EnrichedBooking): string {
  if (booking.patient) {
    return booking.patient.user.name;
  }

  // Guest booking — try to extract the name from notes.
  const notes = booking.notes;
  if (notes && notes.startsWith(GUEST_NOTES_PREFIX)) {
    const rest = notes.slice(GUEST_NOTES_PREFIX.length).trim();
    const name = rest.split("|")[0]?.trim();
    if (name) {
      return `${GUEST_NOTES_PREFIX} ${name}`;
    }
  }

  return "Invitado";
}
