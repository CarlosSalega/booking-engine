/**
 * Custom `timeGridEvent` for Schedule-X.
 *
 * Renders a single booking inside a week/day time-grid cell. Schedule-X
 * applies the per-calendar background color via the `calendars` config;
 * this component layers the foreground content (time range, patient
 * name, service) on top.
 *
 * The component is a Client Component because Schedule-X runs only on
 * the client (it depends on `temporal-polyfill/global`, which mutates
 * the global `Temporal` object and is unsafe in Server Components).
 *
 * Click behavior: the popover lives in the parent `BookingCalendar`
 * (PR #2) and is wired via Schedule-X's `onEventClick` callback. This
 * component does NOT own click state.
 */

"use client";

import { Temporal } from "temporal-polyfill";

import { tzArg } from "./booking-calendar-utils";
import { cn } from "@/lib/utils";

/**
 * Minimal event shape that Schedule-X hands to the `timeGridEvent`
 * custom component. The full `CalendarAppEvent` is exported from
 * `booking-calendar-utils.ts`; this is a structural subset for the
 * component's own prop type.
 *
 * `start` / `end` are typed as `string | Temporal.ZonedDateTime`
 * because Schedule-X passes the original Temporal objects through
 * to custom components — it does NOT stringify them. The runtime
 * value depends on what `bookingToCalendarEvent` returned.
 */
export interface TimeGridCalendarEvent {
  id: string | number;
  title: string;
  description?: string;
  start: string | Temporal.ZonedDateTime;
  end: string | Temporal.ZonedDateTime;
  calendarId?: string;
}

interface BookingCalendarEventProps {
  calendarEvent: TimeGridCalendarEvent;
  /** Schedule-X class for the outer event element. Forwarded to the wrapper. */
  calendarEventPlacement?: string;
}

const AR_LOCALE = "es-AR";

/**
 * Format a `Temporal.ZonedDateTime` (or ISO string) as HH:mm in 24h
 * Argentinian Spanish. Mirrors `formatBookingTime` from the bookings
 * presentation layer but uses Temporal — it has to be local to this
 * file because the calendar only loads on the client.
 *
 * Schedule-X passes the original Temporal objects through to custom
 * components (no stringification), so we accept both shapes:
 * - `Temporal.ZonedDateTime` — from `bookingToCalendarEvent` (common).
 * - `string` — ISO with bracket (e.g. `…-03:00[America/…]`) or plain
 *   UTC (`…Z`). Strings without a bracket route through
 *   `Instant` + `toZonedDateTimeISO(tzArg)` so the displayed
 *   wall-clock time matches the user's time zone.
 */
function formatHourMinute(value: string | Temporal.ZonedDateTime): string {
  const zdt =
    typeof value === "string"
      ? value.includes("[")
        ? Temporal.ZonedDateTime.from(value)
        : Temporal.Instant.from(value).toZonedDateTimeISO(tzArg)
      : value; // already a ZonedDateTime from bookingToCalendarEvent

  return new Intl.DateTimeFormat(AR_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(zdt.epochMilliseconds));
}

export function BookingCalendarEvent({
  calendarEvent,
  calendarEventPlacement,
}: BookingCalendarEventProps) {
  const startLabel = formatHourMinute(calendarEvent.start);
  const endLabel = formatHourMinute(calendarEvent.end);

  return (
    <div
      data-testid="booking-calendar-event"
      data-event-id={calendarEvent.id}
      className={cn(
        "flex h-full w-full flex-col gap-0.5 overflow-hidden px-1.5 py-1 text-xs",
        calendarEventPlacement,
      )}
    >
      <div
        className="font-mono tabular-nums opacity-80"
        data-testid="booking-calendar-event-range"
      >
        {startLabel} – {endLabel}
      </div>
      <div
        className="truncate font-medium"
        data-testid="booking-calendar-event-title"
      >
        {calendarEvent.title}
      </div>
      {calendarEvent.description ? (
        <div
          className="truncate opacity-80"
          data-testid="booking-calendar-event-service"
        >
          {calendarEvent.description}
        </div>
      ) : null}
    </div>
  );
}
