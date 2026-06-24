"use client";

/**
 * `BookingCalendar` — the Client Component that wraps Schedule-X.
 *
 * Responsibilities:
 *   1. Import the Schedule-X theme + Temporal polyfill globally.
 *      `temporal-polyfill/global` mutates the global `Temporal` object;
 *      Schedule-X and the custom event components both rely on it. It
 *      MUST be imported before any Schedule-X import.
 *   2. Convert `EnrichedBooking[]` to Schedule-X events via
 *      `bookingToCalendarEvent`.
 *   3. Build the `calendars` config from `STATUS_HEX` so each
 *      `BookingStatus` maps to one calendar with the matching color
 *      triple (light + dark).
 *   4. Wire the 3 views (week, day, month grid), the es-AR locale,
 *      and Monday as the first day of the week.
 *   5. Forward `onEventClick` (popover) and `onRangeUpdate`
 *      (refetch) callbacks to the parent.
 *   6. Debounce `onRangeUpdate` calls by 200ms so rapid navigation
 *      (e.g. clicking "next week" three times quickly) does NOT
 *      fire three refetches.
 *   7. Swap the default view to "day" on mobile viewports (≤ 768px)
 *      so the user lands on a single-day view that's usable on
 *      small screens.
 *
 * The popover actions, the toolbar, the empty state, and the URL
 * sync all live in PR #2. This wrapper only owns the Schedule-X
 * integration; the rest is layered on top.
 */

import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import "./booking-calendar.css";

import { useEffect, useMemo, useRef } from "react";
import {
  ScheduleXCalendar,
  useNextCalendarApp,
} from "@schedule-x/react";
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
} from "@schedule-x/calendar";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import { STATUS_HEX } from "@/modules/bookings/presentation/status-tones";

import {
  bookingToCalendarEvent,
  type CalendarAppEvent,
} from "./booking-calendar-utils";
import { BookingCalendarEvent } from "./booking-calendar-event";
import { BookingCalendarMonthEvent } from "./booking-calendar-month-event";
import { useMediaQuery } from "@/hooks/use-media-query";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Schedule-X event augmented with the source booking, used by the
 * popover. Re-exported from the event component so consumers can
 * import it from a single module.
 */
export type { CalendarAppEvent } from "./booking-calendar-utils";

interface BookingCalendarProps {
  /** Bookings to render. Server Component serializes Dates to ISO strings
   *  on the RSC boundary; the wrapper accepts the typed `EnrichedBooking`. */
  bookings: EnrichedBooking[];
  /** Initial view name. Defaults to "week". */
  defaultView?: "week" | "day" | "month-grid";
  /** Fires when the user clicks an event. The popover hooks into this. */
  onEventClick?: (event: CalendarAppEvent) => void;
  /** Fires when the visible date range changes. The data layer hooks
   *  into this to refetch bookings for the new range. */
  onRangeUpdate?: (range: { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }) => void;
}

// ---------------------------------------------------------------------------
// calendars config — one entry per BookingStatus
// ---------------------------------------------------------------------------

/**
 * Build the Schedule-X `calendars` config from `STATUS_HEX`. Each
 * entry's `colorName` MUST equal the `BookingStatus` value because
 * the mapper sets `event.calendarId = booking.status`.
 *
 * The structure matches the v4 `CalendarType` shape:
 *   { colorName, lightColors, darkColors }.
 */
function buildCalendarsConfig() {
  return (Object.values(BookingStatus) as BookingStatusType[]).reduce(
    (acc, status) => {
      const entry = STATUS_HEX[status];
      acc[status] = {
        colorName: entry.colorName,
        lightColors: entry.lightColors,
        darkColors: entry.darkColors,
      };
      return acc;
    },
    {} as Record<
      BookingStatusType,
      {
        colorName: string;
        lightColors: typeof STATUS_HEX[BookingStatusType]["lightColors"];
        darkColors: typeof STATUS_HEX[BookingStatusType]["darkColors"];
      }
    >,
  );
}

// ---------------------------------------------------------------------------
// BookingCalendar
// ---------------------------------------------------------------------------

export function BookingCalendar({
  bookings,
  defaultView = "week",
  onEventClick,
  onRangeUpdate,
}: BookingCalendarProps) {
  // 1. Mobile detection. On a small viewport the wrapper forces
  //    the default view to "day" so the user lands on a usable
  //    single-day layout (the week view doesn't fit a 375px screen).
  const isMobile = useMediaQuery("(max-width: 768px)");
  const effectiveDefaultView: "week" | "day" | "month-grid" = isMobile
    ? "day"
    : defaultView;

  // 2. Map bookings → Schedule-X events. Memoized so the array
  //    identity is stable across re-renders (Schedule-X diffs events
  //    by id).
  const events = useMemo(
    () => bookings.map(bookingToCalendarEvent),
    [bookings],
  );

  const calendars = useMemo(() => buildCalendarsConfig(), []);

  // 3. onRangeUpdate debounce — rapid navigation (e.g. spamming
  //    the "next week" arrow) should NOT fire one fetch per click.
  //    We hold the latest range in a ref and emit a single call
  //    200ms after the last change. Schedule-X hands us an object
  //    shaped `{ start, end }` (matching our `CalendarViewRange`
  //    type), not an array.
  const rangeRef = useRef<{ start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime } | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup any pending timer on unmount so the callback doesn't
    // fire after the component has been swapped out.
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const calendar = useNextCalendarApp({
    views: [createViewWeek(), createViewDay(), createViewMonthGrid()],
    events,
    calendars,
    defaultView: effectiveDefaultView,
    locale: "es-AR",
    firstDayOfWeek: 1,
    callbacks: {
      onEventClick: (event) => {
        // Schedule-X hands the event straight back; it has the `_booking`
        // ref attached by the mapper, so the popover can read patient,
        // service, status, etc. without re-deriving anything.
        onEventClick?.(event as unknown as CalendarAppEvent);
      },
      onRangeUpdate: (range) => {
        // Store the latest range and schedule the debounced emit.
        rangeRef.current = range as {
          start: Temporal.ZonedDateTime;
          end: Temporal.ZonedDateTime;
        };
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          if (rangeRef.current && onRangeUpdate) {
            onRangeUpdate(rangeRef.current);
          }
        }, 200);
      },
    },
  });

  return (
    <div className="sx-react-calendar-wrapper h-[800px] max-h-[90vh] w-full max-w-full">
      <ScheduleXCalendar
        calendarApp={calendar}
        customComponents={{
          timeGridEvent: BookingCalendarEvent,
          // Mobile (≤ 768px) shows a dot-only month grid; desktop
          // shows the same component but Schedule-X gives it more
          // space to render the count alongside the dot. The
          // component itself reads the schedule-x cell width to
          // decide which to render.
          monthGridEvent: BookingCalendarMonthEvent,
        }}
      />
    </div>
  );
}
