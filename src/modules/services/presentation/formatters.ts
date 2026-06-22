/**
 * Services presentation formatters.
 *
 * Pure, dependency-free helpers for rendering service data in the UI.
 * Mirrors the bookings `formatters.ts` and patients `formatters.ts`
 * patterns: status → label map, plus a small set of display helpers.
 * Importable from both Server and Client Components.
 *
 * Conventions:
 * - All labels in Argentinian Spanish (es-AR).
 * - No React, no Next.js, no Prisma. Pure functions.
 * - The status and payment-type label maps are exported (mirroring
 *   the bookings `BOOKING_STATUS_LABEL` pattern) so consumers like
 *   the dashboard module can render the same labels.
 * - `formatPrice` is the single source of truth for currency
 *   formatting across the services module; it always renders ARS
 *   (the data layer hardcodes the currency — AD1) with 2 fraction
 *   digits to preserve cents.
 */

import { PaymentType, type PaymentTypeType, ServiceStatus, type ServiceStatusType } from "../domain/service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AR_LOCALE = "es-AR";
const AR_CURRENCY = "ARS";

// ---------------------------------------------------------------------------
// Status labels — Argentinian Spanish
// ---------------------------------------------------------------------------

/**
 * Service status → human label in Argentinian Spanish. Keys are the
 * 2 values of `ServiceStatusType`. Used by the status badge on the
 * list page, the detail page, and any other component that needs to
 * render a status.
 */
export const SERVICE_STATUS_LABEL: Record<ServiceStatusType, string> = {
  [ServiceStatus.ACTIVE]: "Activo",
  [ServiceStatus.INACTIVE]: "Inactivo",
};

/**
 * Returns the Argentinian Spanish label for a service status.
 * Falls back to the raw status string when unknown (defensive).
 */
export function getServiceStatusLabel(status: ServiceStatusType): string {
  return SERVICE_STATUS_LABEL[status] ?? status;
}

// ---------------------------------------------------------------------------
// Payment-type labels — Argentinian Spanish
// ---------------------------------------------------------------------------

/**
 * Payment type → human label in Argentinian Spanish. Keys are the
 * 3 values of `PaymentTypeType`. Used by the list page (column
 * "Tipo de pago") and the detail page.
 */
export const PAYMENT_TYPE_LABEL: Record<PaymentTypeType, string> = {
  [PaymentType.NONE]: "Sin costo",
  [PaymentType.DEPOSIT]: "Seña",
  [PaymentType.FULL]: "Pago completo",
};

/**
 * Returns the Argentinian Spanish label for a service payment type.
 * Falls back to the raw value when unknown.
 *
 * Note: this label set is intentionally different from the
 * bookings `formatPaymentType` ("Sin pago" instead of "Sin costo"
 * for NONE) because the services page speaks about the SERVICE
 * (which has no cost) while the bookings page speaks about the
 * PAYMENT (which is missing). Different vocabulary, different
 * module.
 */
export function getPaymentTypeLabel(type: PaymentTypeType): string {
  return PAYMENT_TYPE_LABEL[type] ?? type;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * Formats a number as Argentinian pesos with 2 fraction digits
 * (e.g. 2000 → "$ 2.000,00"). Mirrors the bookings
 * `formatCurrency` helper, scoped to the services module so the
 * services layer owns its own presentation rules.
 *
 * The data layer hardcodes ARS (AD1), so this formatter always
 * renders ARS — there is no `currency` argument.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(AR_LOCALE, {
    style: "currency",
    currency: AR_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
