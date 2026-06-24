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
 */

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";

// ---------------------------------------------------------------------------
// Tailwind class tones — consumed by `BookingStatusBadge`.
// Mirrors the existing inline `STATUS_TONE_CLASS` previously declared in
// `src/components/bookings/booking-status-badge.tsx`. Empty strings are
// allowed for the destructive-variant statuses (CANCELLED, NO_SHOW) which
// inherit their color from the badge variant and don't need an extra tone.
// ---------------------------------------------------------------------------

export const STATUS_TONE_CLASS: Record<BookingStatusType, string> = {
  [BookingStatus.PENDING]: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  [BookingStatus.CONFIRMED]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [BookingStatus.CANCELLED]: "",
  [BookingStatus.RESCHEDULED]: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  [BookingStatus.COMPLETED]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  [BookingStatus.NO_SHOW]: "",
  [BookingStatus.AWAITING_PAYMENT]: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
};

// ---------------------------------------------------------------------------
// Schedule-X calendars config — one entry per `BookingStatus`.
// Schedule-X renders events via the `calendars` config keyed by the
// event's `calendarId`; each entry defines the light/dark color triple
// the grid uses to draw that event. The `colorName` MUST equal the
// `BookingStatus` value because the mapping `event.calendarId = booking.status`
// is set in `bookingToCalendarEvent`.
//
// Hex values mirror the Tailwind 500 (`main`), 100 (`container`), and
// 800 (`onContainer`) scales so the calendar event matches the badge's
// visual vocabulary on the list page.
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
    lightColors: {
      main: "#10b981", // emerald-500 (same family as CONFIRMED; opacity/context differentiates)
      container: "#d1fae5",
      onContainer: "#047857",
    },
    darkColors: {
      main: "#34d399",
      container: "#064e3b",
      onContainer: "#d1fae5",
    },
  },
  [BookingStatus.NO_SHOW]: {
    colorName: BookingStatus.NO_SHOW,
    lightColors: {
      main: "#ef4444", // red-500 (same family as CANCELLED; opacity/context differentiates)
      container: "#fee2e2",
      onContainer: "#b91c1c",
    },
    darkColors: {
      main: "#f87171",
      container: "#7f1d1d",
      onContainer: "#fee2e2",
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
