/**
 * Shared formatters and small pure helpers for the dashboard module.
 *
 * Keep this file dependency-free (no Prisma, no Next.js) so it can be
 * imported from both Server and Client Components.
 */

const AR_LOCALE = "es-AR";
const AR_CURRENCY = "ARS";

/**
 * Formats a number as Argentinian pesos.
 * Example: 42500 → "$42.500,00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(AR_LOCALE, {
    style: "currency",
    currency: AR_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number with thousands separators (es-AR).
 * Example: 1234 → "1.234"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(AR_LOCALE).format(value);
}

/**
 * Formats an hour-and-minute from a Date in the es-AR locale.
 * Example: 14:30 → "14:30 hs"
 */
export function formatTime(date: Date): string {
  return `${new Intl.DateTimeFormat(AR_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)} hs`;
}

/**
 * Renders a "hace 2 horas" style relative timestamp.
 *
 * Uses the standard es-AR Intl.RelativeTimeFormat. Steps:
 * < 60s → "hace X segundos"
 * < 60m → "hace X minutos"
 * < 24h → "hace X horas"
 * < 7d  → "hace X días"
 * else  → full date.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const formatter = new Intl.RelativeTimeFormat(AR_LOCALE, { numeric: "auto" });

  if (diffSec < 60) return formatter.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return formatter.format(-diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return formatter.format(-diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return formatter.format(-diffDay, "day");
  return new Intl.DateTimeFormat(AR_LOCALE, {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/**
 * Booking status → human label in Argentinian Spanish.
 */
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Reprogramada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistió",
  AWAITING_PAYMENT: "Pago pendiente",
};

export function getBookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABEL[status] ?? status;
}
