/**
 * Custom `monthGridEvent` for Schedule-X.
 *
 * Renders the per-day indicator inside a month-grid cell. Schedule-X
 * calls this component with the first event of the day and a list of
 * the other events sharing the same day — the visual is a colored dot
 * and a count badge, the click target stays the cell (Schedule-X wires
 * that to the day view navigation via `onClickDate`).
 *
 * The component is a Client Component because the calendar only loads
 * on the client.
 */

"use client";

import { cn } from "@/lib/utils";

import type { TimeGridCalendarEvent } from "./booking-calendar-event";

interface BookingCalendarMonthEventProps {
  /** The first event of the day. Schedule-X passes this for every cell. */
  calendarEvent: TimeGridCalendarEvent;
  /**
   * The other events on the same day. Schedule-X does NOT pass this
   * natively — the parent calendar wrapper computes the per-day
   * grouping and forwards the count. Optional so this component
   * remains renderable in isolation (tests, error states).
   */
  eventsOnDay?: TimeGridCalendarEvent[];
  /** Schedule-X class for the outer element. */
  calendarEventPlacement?: string;
}

export function BookingCalendarMonthEvent({
  calendarEvent,
  eventsOnDay,
  calendarEventPlacement,
}: BookingCalendarMonthEventProps) {
  // When Schedule-X passes the full month list as `events`, use its
  // length; otherwise fall back to the single event passed via
  // `calendarEvent` (one event on the day).
  const count = eventsOnDay ? eventsOnDay.length : 1;

  return (
    <div
      data-testid="booking-calendar-month-event"
      data-event-id={calendarEvent.id}
      className={cn(
        "flex items-center gap-1 px-1 text-xs",
        calendarEventPlacement,
      )}
    >
      <span
        data-testid="month-event-dot"
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      <span
        className="font-medium tabular-nums"
        data-testid="month-event-count"
      >
        {count}
      </span>
    </div>
  );
}
