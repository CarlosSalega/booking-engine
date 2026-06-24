/**
 * Calendar mapping utilities — pure, no React.
 *
 * The calendar is a presentation view over `EnrichedBooking` (from
 * `src/modules/bookings/data/booking-data.types.ts`). This module
 * translates domain data into Schedule-X event shapes and exposes the
 * status-color map and the date-range math so both the calendar
 * wrapper and the popover can share a single source of truth.
 *
 * Date strategy (AD5 in design.md):
 *   - Server Components serialize `Date` fields as ISO strings on the
 *     RSC boundary to avoid silent `Date` → string coercion bugs.
 *   - On the client, the `Temporal.ZonedDateTime` API does all
 *     date math (range boundaries, start/end positioning). The
 *     `temporal-polyfill@0.3.0` package is required as a Schedule-X
 *     peer dependency; the calendar component imports it globally
 *     before any other Schedule-X import.
 *
 * Color strategy (AD6 in design.md):
 *   - Schedule-X renders events via a per-calendar color triple
 *     (`colorName`, `lightColors`, `darkColors`). We map each
 *     `BookingStatusType` to one calendar so `event.calendarId`
 *     becomes the booking's status, and the visual vocabulary stays
 *     in sync with `BookingStatusBadge` via `STATUS_HEX` from
 *     `status-tones.ts`.
 */

import { Temporal } from "temporal-polyfill";

import { type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import { STATUS_HEX } from "@/modules/bookings/presentation/status-tones";

/**
 * The IANA time zone the calendar renders in. Matches the runtime
 * environment (`TZ=America/Argentina/Buenos_Aires` in production
 * and CI) so the visible times line up with the user's wall clock.
 */
export const tzArg = "America/Argentina/Buenos_Aires";

// ---------------------------------------------------------------------------
// bookingToCalendarEvent
// ---------------------------------------------------------------------------

/**
 * A Schedule-X calendar event augmented with a reference to the
 * source booking. The `_booking` field is the side-channel the
 * popover uses to render the patient/service/notes and to dispatch
 * Server Actions — it is NEVER serialized to JSON (Schedule-X walks
 * the shape internally), so it stays a typed `EnrichedBooking`.
 */
export interface CalendarAppEvent {
  id: string;
  title: string;
  description: string;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  calendarId: string;
  _booking: EnrichedBooking;
}

/**
 * Map an `EnrichedBooking` to a Schedule-X calendar event.
 *
 * The event's `calendarId` is the booking's status so the per-status
 * color (`STATUS_CALENDAR_COLORS[status]`) is applied automatically
 * by the Schedule-X `calendars` config.
 */
export function bookingToCalendarEvent(
  booking: EnrichedBooking,
): CalendarAppEvent {
  return {
    id: booking.id,
    title: getCalendarEventTitle(booking),
    description: booking.service.name,
    start: toZonedDateTime(booking.startTime),
    end: toZonedDateTime(booking.endTime),
    calendarId: booking.status,
    _booking: booking,
  };
}

/**
 * Resolve the title shown on the calendar event.
 *
 * - Registered patient → `patient.user.name`
 * - Guest booking (patient === null) → "Invitado" (the badge detail
 *   already shows the full guest name in the popover, no need to
 *   parse the notes here).
 */
function getCalendarEventTitle(booking: EnrichedBooking): string {
  return booking.patient?.user.name ?? "Invitado";
}

/**
 * Convert a `Date` (or ISO string) into a `Temporal.ZonedDateTime` in
 * the calendar's time zone.
 *
 * The Temporal polyfill requires an explicit offset to construct a
 * `ZonedDateTime` directly (a `…Z` ISO string has no offset field
 * beyond UTC, which is not enough). The supported bridge is
 * `Instant.from(iso) → toZonedDateTimeISO(tz)` — same shape as the
 * full Temporal spec, works for both `Date` (we call `.toISOString()`)
 * and for already-serialized ISO strings from the RSC boundary.
 */
function toZonedDateTime(value: Date | string): Temporal.ZonedDateTime {
  const iso = typeof value === "string" ? value : value.toISOString();
  return Temporal.Instant.from(iso).toZonedDateTimeISO(tzArg);
}

// ---------------------------------------------------------------------------
// STATUS_CALENDAR_COLORS — flat view over `STATUS_HEX`
// ---------------------------------------------------------------------------

/**
 * Flat per-status color triple that the calendar wrapper can spread
 * into the Schedule-X `calendars` config. The full `STATUS_HEX`
 * structure (with `colorName` + `lightColors` + `darkColors`) is the
 * source of truth in `status-tones.ts`; this map is a derived
 * convenience for tests and code that just needs the primary tone.
 */
export interface CalendarColor {
  backgroundColor: string;
  borderColor: string;
}

export const STATUS_CALENDAR_COLORS: Record<BookingStatusType, CalendarColor> = (
  Object.keys(STATUS_HEX) as BookingStatusType[]
).reduce(
  (acc, status) => {
    const entry = STATUS_HEX[status];
    acc[status] = {
      backgroundColor: entry.lightColors.container,
      borderColor: entry.lightColors.main,
    };
    return acc;
  },
  {} as Record<BookingStatusType, CalendarColor>,
);

// ---------------------------------------------------------------------------
// computeDateRange — view-aware date range for `getBookings` filters
// ---------------------------------------------------------------------------

export type CalendarViewName = "week" | "day" | "month";

/**
 * Compute the visible date range for a given view, anchored on the
 * supplied date. Pure: same input → same output, no clock dependency.
 *
 * - `week` → Mon–Sun (inclusive). Snaps backwards to Monday if the
 *   input is mid-week.
 * - `day`  → [date, date + 1 day). The upper bound is exclusive so
 *   `getBookings(..., { dateRange: { gte: start, lte: end } })` still
 *   includes every booking that starts on the same calendar day.
 * - `month` → [day-1, next-day-1). Same exclusive upper bound so a
 *   booking on March 31 23:59 still falls inside the range.
 */
export function computeDateRange(
  date: Temporal.PlainDate,
  view: CalendarViewName,
): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
  if (view === "day") {
    return {
      start: date,
      end: date.add({ days: 1 }),
    };
  }

  if (view === "month") {
    const startOfMonth = date.with({ day: 1 });
    const startOfNextMonth = startOfMonth.add({ months: 1 });
    return {
      start: startOfMonth,
      end: startOfNextMonth,
    };
  }

  // week — snap back to Monday. Temporal uses ISO day numbers:
  // 1 = Monday, 7 = Sunday.
  const start = date.subtract({ days: date.dayOfWeek - 1 });
  const end = start.add({ days: 7 });
  return { start, end };
}
