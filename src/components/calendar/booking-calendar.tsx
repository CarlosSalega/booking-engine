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
 *
 * The popover actions, the toolbar, the empty state, and the URL
 * sync all live in PR #2. This wrapper only owns the Schedule-X
 * integration; the rest is layered on top.
 */

import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import "./booking-calendar.css";

import { useMemo } from "react";
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
  // Map bookings → Schedule-X events. Memoized so the array identity
  // is stable across re-renders (Schedule-X diffs events by id).
  const events = useMemo(
    () => bookings.map(bookingToCalendarEvent),
    [bookings],
  );

  const calendars = useMemo(() => buildCalendarsConfig(), []);

  const calendar = useNextCalendarApp({
    views: [createViewWeek(), createViewDay(), createViewMonthGrid()],
    events,
    calendars,
    defaultView,
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
        onRangeUpdate?.(range);
      },
    },
  });

  return (
    <div className="sx-react-calendar-wrapper h-[800px] max-h-[90vh] w-full max-w-full">
      <ScheduleXCalendar
        calendarApp={calendar}
        customComponents={{
          timeGridEvent: BookingCalendarEvent,
          monthGridEvent: BookingCalendarMonthEvent,
        }}
      />
    </div>
  );
}
