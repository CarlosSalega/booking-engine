/**
 * Shared status visual tones for the bookings module.
 *
 * The `BookingStatusBadge` (Tailwind classes on a shadcn `Badge`) and the
 * Schedule-X calendar (`STATUS_HEX` consumed by the `calendars` config)
 * read from the same source of truth so the visual vocabulary stays in
 * sync across the list page, the detail page, and the calendar.
 *
 * Why a separate file?
 * - Tailwind class names are a *string* contract; Schedule-X consumes
 *   structured objects. Mapping both to a `BookingStatusType` here keeps
 *   each consumer simple and avoids divergent forks.
 * - Tests for both the badge and the calendar can pin the exact color
 *   values in one place.
 *
 * Pure: no React, no Next.js, no Prisma. Importable from Server and
 * Client Components.
 *
 * Slice 2 (ux-audit-fixes) update:
 *   - `STATUS_TONE_CLASS` values now reference semantic `--status-*`
 *     token classes (consumed via Tailwind v4's `@theme inline`
 *     `--color-status-*` mapping) instead of raw Tailwind palette
 *     substrings. CANCELLED and NO_SHOW remain empty strings because
 *     their color comes from the `destructive` Badge variant.
 *   - `STATUS_HEX` for CANCELLED is neutral gray (D1: cancellations
 *     should not read as emergencies) and COMPLETED is dark-neutral
 *     (D1: the previous emerald collided with CONFIRMED). Hex values
 *     approximate the tokens because Schedule-X requires concrete
 *     colors — the badges themselves render via the token classes
 *     defined in `globals.css`.
 */

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";

// ---------------------------------------------------------------------------
// Tailwind class tones — consumed by `BookingStatusBadge`.
// Mirrors the per-status color mapping previously declared as raw palette
// substrings; now every entry references the `--status-*` token class
// defined in `globals.css`. Empty strings are intentional for the
// destructive-variant statuses (CANCELLED, NO_SHOW) which inherit their
// color from the badge variant and don't need an extra tone.
//
// Opacity modifiers (`/15`, `/30`) are valid on oklch()-authored tokens
// in Tailwind v4 — they preserve the original `/15` tint idiom while
// keeping the rendering theme-reactive.
// ---------------------------------------------------------------------------

export const STATUS_TONE_CLASS: Record<BookingStatusType, string> = {
  [BookingStatus.PENDING]:
    "bg-status-pending/15 text-status-pending-foreground border-status-pending/30",
  [BookingStatus.CONFIRMED]:
    "bg-status-confirmed/15 text-status-confirmed-foreground border-status-confirmed/30",
  [BookingStatus.CANCELLED]: "",
  [BookingStatus.RESCHEDULED]:
    "bg-status-rescheduled/15 text-status-rescheduled-foreground border-status-rescheduled/30",
  [BookingStatus.COMPLETED]:
    "bg-status-completed/15 text-status-completed-foreground border-status-completed/30",
  [BookingStatus.NO_SHOW]: "",
  [BookingStatus.AWAITING_PAYMENT]:
    "bg-status-awaiting-payment/15 text-status-awaiting-payment-foreground border-status-awaiting-payment/30",
};

// ---------------------------------------------------------------------------
// Schedule-X calendars config — one entry per `BookingStatus`.
// Schedule-X renders events via the `calendars` config keyed by the
// event's `calendarId`; each entry defines the light/dark color triple
// the grid uses to draw that event. The `colorName` MUST equal the
// `BookingStatus` value because the mapping `event.calendarId = booking.status`
// is set in `bookingToCalendarEvent`.
//
// Hex values approximate the corresponding `--status-*` token (defined
// as oklch() in `globals.css`) because Schedule-X requires concrete
// colors. They mirror the Tailwind 500 (`main`), 100 (`container`), and
// 800 (`onContainer`) scales so the calendar event matches the badge's
// visual vocabulary on the list page. CANCELLED and COMPLETED apply the
// D1 supersession (gray / dark-neutral respectively).
// ---------------------------------------------------------------------------

export interface ScheduleXCalendarColor {
  /** A short identifier used internally by Schedule-X for CSS properties. */
  colorName: string;
  /** Colors used in light mode. */
  lightColors: {
    /** The primary color (e.g. event border, text on container). */
    main: string;
    /** The event background. */
    container: string;
    /** Text/icon color when placed on top of `container`. */
    onContainer: string;
  };
  /** Colors used in dark mode. */
  darkColors: {
    main: string;
    container: string;
    onContainer: string;
  };
}

export const STATUS_HEX: Record<BookingStatusType, ScheduleXCalendarColor> = {
  [BookingStatus.PENDING]: {
    colorName: BookingStatus.PENDING,
    lightColors: {
      main: "#f59e0b", // amber-500
      container: "#fef3c7", // amber-100
      onContainer: "#92400e", // amber-800
    },
    darkColors: {
      main: "#fbbf24", // amber-400
      container: "#78350f", // amber-900
      onContainer: "#fef3c7", // amber-100
    },
  },
  [BookingStatus.CONFIRMED]: {
    colorName: BookingStatus.CONFIRMED,
    lightColors: {
      main: "#10b981", // emerald-500
      container: "#d1fae5", // emerald-100
      onContainer: "#047857", // emerald-700
    },
    darkColors: {
      main: "#34d399", // emerald-400
      container: "#064e3b", // emerald-900
      onContainer: "#d1fae5", // emerald-100
    },
  },
  [BookingStatus.CANCELLED]: {
    colorName: BookingStatus.CANCELLED,
    // D1 supersession — neutral gray (approximation of
    // oklch(0.55 0.04 257.4)). Cancellations should not read as
    // emergencies; staff use destructive badges only for NO_SHOW.
    lightColors: {
      main: "#6b7280", // gray-500
      container: "#f3f4f6", // gray-100
      onContainer: "#1f2937", // gray-800
    },
    darkColors: {
      main: "#94a3b8", // slate-400
      container: "#1e293b", // slate-800
      onContainer: "#f1f5f9", // slate-100
    },
  },
  [BookingStatus.RESCHEDULED]: {
    colorName: BookingStatus.RESCHEDULED,
    lightColors: {
      main: "#8b5cf6", // violet-500
      container: "#ede9fe", // violet-100
      onContainer: "#6d28d9", // violet-700
    },
    darkColors: {
      main: "#a78bfa", // violet-400
      container: "#4c1d95", // violet-900
      onContainer: "#ede9fe", // violet-100
    },
  },
  [BookingStatus.COMPLETED]: {
    colorName: BookingStatus.COMPLETED,
    // D1 supersession — dark-neutral slate (approximation of
    // oklch(0.37 0.04 257.3)). The previous emerald collided with
    // CONFIRMED; dark-neutral separates the two statuses.
    lightColors: {
      main: "#475569", // slate-600
      container: "#e2e8f0", // slate-200
      onContainer: "#1e293b", // slate-800
    },
    darkColors: {
      main: "#64748b", // slate-500
      container: "#0f172a", // slate-900
      onContainer: "#e2e8f0", // slate-200
    },
  },
  [BookingStatus.NO_SHOW]: {
    colorName: BookingStatus.NO_SHOW,
    // NO_SHOW keeps the destructive red — it has real revenue / scheduling
    // impact and warrants the alert.
    lightColors: {
      main: "#ef4444", // red-500
      container: "#fee2e2", // red-100
      onContainer: "#b91c1c", // red-700
    },
    darkColors: {
      main: "#f87171", // red-400
      container: "#7f1d1d", // red-900
      onContainer: "#fee2e2", // red-100
    },
  },
  [BookingStatus.AWAITING_PAYMENT]: {
    colorName: BookingStatus.AWAITING_PAYMENT,
    lightColors: {
      main: "#f97316", // orange-500
      container: "#ffedd5", // orange-100
      onContainer: "#c2410c", // orange-700
    },
    darkColors: {
      main: "#fb923c", // orange-400
      container: "#7c2d12", // orange-900
      onContainer: "#ffedd5", // orange-100
    },
  },
};