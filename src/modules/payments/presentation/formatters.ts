/**
 * Payments presentation formatters.
 *
 * Pure, dependency-free helpers for rendering payment data in the UI.
 * Mirrors the patients/professionals/bookings `formatters.ts` pattern:
 * status → label map, plus a small set of display helpers. Importable
 * from both Server and Client Components.
 *
 * Conventions:
 * - All labels in Argentinian Spanish (es-AR).
 * - No React, no Next.js, no Prisma. Pure functions.
 * - The status label map is exported (mirroring the dashboard and
 *   patients/professionals patterns) so consumers like the status
 *   badge, the filter dropdown, and the detail card can render the
 *   same labels from a single source of truth.
 * - `formatCurrency` uses the runtime `Intl` API with the
 *   `es-AR` locale and the ARS currency. The es-AR locale renders
 *   with a leading currency symbol (`$`), a non-breaking space
 *   separator, dot as thousands separator, and comma as decimal
 *   separator (e.g. `5000` → `"$ 5.000,00"`).
 */

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";

const AR_LOCALE = "es-AR";
const AR_CURRENCY = "ARS";

/** Fallback label used when a status is outside the known enum values. */
const UNKNOWN_STATUS_LABEL = "Desconocido";

// ---------------------------------------------------------------------------
// Status labels — Argentinian Spanish
// ---------------------------------------------------------------------------

/**
 * Provider payment status → human label in Argentinian Spanish. Keys
 * are the 5 values of `ProviderPaymentStatusType`. Used by the
 * status badge, the status filter, and the detail card.
 */
export const PAYMENT_STATUS_LABEL: Record<ProviderPaymentStatusType, string> = {
  [ProviderPaymentStatus.PENDING]: "Pendiente",
  [ProviderPaymentStatus.APPROVED]: "Aprobado",
  [ProviderPaymentStatus.REJECTED]: "Rechazado",
  [ProviderPaymentStatus.CANCELLED]: "Cancelado",
  [ProviderPaymentStatus.IN_PROCESS]: "En proceso",
};

/**
 * Returns the Argentinian Spanish label for a provider payment status.
 * Falls back to "Desconocido" when the status is outside the known
 * enum values — defensive against drift between the Prisma enum and
 * the domain enum (e.g. a new provider status added upstream that
 * the UI has not been taught about yet).
 */
export function getPaymentStatusLabel(
  status: ProviderPaymentStatusType,
): string {
  return PAYMENT_STATUS_LABEL[status] ?? UNKNOWN_STATUS_LABEL;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * Formats a numeric amount as Argentinian pesos using the
 * `es-AR` locale (e.g. `5000` → `"$ 5.000,00"`, `2500.5` →
 * `"$ 2.500,50"`).
 *
 * Uses the runtime `Intl` API with the `es-AR` locale and the ARS
 * currency. Default currency formatting always renders two fraction
 * digits, which preserves the cents (relevant for deposits and
 * refunds).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(AR_LOCALE, {
    style: "currency",
    currency: AR_CURRENCY,
  }).format(amount);
}
