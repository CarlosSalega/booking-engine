/**
 * Tests for the custom Schedule-X event components used in the
 * booking calendar.
 *
 * Two custom components replace Schedule-X's defaults:
 *
 * 1. `BookingCalendarEvent` (`timeGridEvent`) — week + day views.
 *    Renders the time range, patient name, and service. Schedule-X
 *    applies the per-calendar background color from the `calendars`
 *    config; this component layers the foreground content on top.
 *
 * 2. `BookingCalendarMonthEvent` (`monthGridEvent`) — month view.
 *    Renders a colored dot + count badge per day cell. The day cell
 *    itself stays clickable (Schedule-X wires that to the day view
 *    navigation); the inner `<div>` is for the visual content only.
 *
 * Strategy: render the component with a minimal `calendarEvent`
 * shape and assert the rendered text content. The polyfill for
 * `Temporal` is loaded so the components can construct
 * `Temporal.ZonedDateTime` from the event's `start`/`end` strings.
 */

import "temporal-polyfill/global";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { BookingStatus } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

import { BookingCalendarEvent } from "../booking-calendar-event";
import { BookingCalendarMonthEvent } from "../booking-calendar-month-event";

const mocks = vi.hoisted(() => ({
  useMediaQueryMock: vi.fn().mockReturnValue(false),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mocks.useMediaQueryMock,
}));

function makeEnrichedBooking(
  overrides: Partial<EnrichedBooking> = {},
): EnrichedBooking {
  return {
    id: "b1",
    organizationId: "00000000-0000-4000-8000-000000000001",
    patientId: "00000000-0000-4000-8000-000000000002",
    professionalId: "00000000-0000-4000-8000-000000000003",
    serviceId: "00000000-0000-4000-8000-000000000004",
    startTime: new Date("2026-06-22T13:00:00Z"),
    endTime: new Date("2026-06-22T13:30:00Z"),
    status: BookingStatus.CONFIRMED,
    paymentStatus: "PENDING",
    notes: null,
    createdAt: new Date("2026-06-21T10:00:00Z"),
    updatedAt: new Date("2026-06-21T10:00:00Z"),
    patient: {
      id: "00000000-0000-4000-8000-000000000002",
      user: { name: "Juan Pérez", email: "juan@example.com" },
    },
    professional: {
      id: "00000000-0000-4000-8000-000000000003",
      userId: "00000000-0000-4000-8000-000000000099",
      user: { name: "Dr. García" },
    },
    service: {
      id: "00000000-0000-4000-8000-000000000004",
      name: "Limpieza Dental",
      durationMinutes: 30,
      price: 3500,
      paymentType: "FULL",
    },
    payments: [],
    ...overrides,
  };
}

const booking = makeEnrichedBooking();

const baseCalendarEvent = {
  id: booking.id,
  title: "Juan Pérez",
  description: "Limpieza Dental",
  start: "2026-06-22T10:00:00-03:00[America/Argentina/Buenos_Aires]",
  end: "2026-06-22T10:30:00-03:00[America/Argentina/Buenos_Aires]",
  calendarId: BookingStatus.CONFIRMED,
  _booking: booking,
};

// ---------------------------------------------------------------------------
// BookingCalendarEvent (timeGridEvent)
// ---------------------------------------------------------------------------

describe("BookingCalendarEvent", () => {
  afterEach(() => {
    mocks.useMediaQueryMock.mockReturnValue(false);
  });

  it("renders the patient's display name as the title", () => {
    render(
      <BookingCalendarEvent
        calendarEvent={{ ...baseCalendarEvent, title: "Juan Pérez" }}
      />,
    );
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("renders the service name as the description", () => {
    render(
      <BookingCalendarEvent
        calendarEvent={{ ...baseCalendarEvent, description: "Limpieza Dental" }}
      />,
    );
    expect(screen.getByText("Limpieza Dental")).toBeInTheDocument();
  });

  it("renders the HH:mm–HH:mm time range in Argentinian Spanish 24h format", () => {
    render(
      <BookingCalendarEvent
        calendarEvent={{
          ...baseCalendarEvent,
          start: "2026-06-22T10:00:00-03:00[America/Argentina/Buenos_Aires]",
          end: "2026-06-22T10:30:00-03:00[America/Argentina/Buenos_Aires]",
        }}
      />,
    );
    // 10:00 – 10:30
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  it("renders a different range when the booking spans different hours", () => {
    render(
      <BookingCalendarEvent
        calendarEvent={{
          ...baseCalendarEvent,
          start: "2026-06-22T14:15:00-03:00[America/Argentina/Buenos_Aires]",
          end: "2026-06-22T15:45:00-03:00[America/Argentina/Buenos_Aires]",
        }}
      />,
    );
    expect(screen.getByText(/14:15/)).toBeInTheDocument();
    expect(screen.getByText(/15:45/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BookingCalendarMonthEvent (monthGridEvent)
// ---------------------------------------------------------------------------

describe("BookingCalendarMonthEvent", () => {
  it("renders the booking count when there is a single event", () => {
    render(
      <BookingCalendarMonthEvent
        calendarEvent={baseCalendarEvent}
        // Schedule-X passes a list of events for the same day cell when
        // there are multiple bookings on the same day. The component
        // displays a count derived from this list.
        eventsOnDay={[baseCalendarEvent]}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the booking count for multiple events on the same day", () => {
    const event2 = {
      ...baseCalendarEvent,
      id: "b2",
      title: "María López",
    };
    const event3 = {
      ...baseCalendarEvent,
      id: "b3",
      title: "Carlos Ruiz",
    };
    render(
      <BookingCalendarMonthEvent
        calendarEvent={baseCalendarEvent}
        eventsOnDay={[baseCalendarEvent, event2, event3]}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders a colored dot marker (data-testid='month-event-dot')", () => {
    const { container } = render(
      <BookingCalendarMonthEvent
        calendarEvent={baseCalendarEvent}
        eventsOnDay={[baseCalendarEvent]}
      />,
    );
    const dot = container.querySelector('[data-testid="month-event-dot"]');
    expect(dot).toBeInTheDocument();
  });

  it("renders dot-only (no count) on mobile viewports (≤ 768px)", () => {
    mocks.useMediaQueryMock.mockReturnValue(true);
    const { container } = render(
      <BookingCalendarMonthEvent
        calendarEvent={baseCalendarEvent}
        eventsOnDay={[baseCalendarEvent]}
      />,
    );
    // The dot is still there.
    expect(
      container.querySelector('[data-testid="month-event-dot"]'),
    ).toBeInTheDocument();
    // The count is hidden on mobile to save space.
    expect(
      container.querySelector('[data-testid="month-event-count"]'),
    ).not.toBeInTheDocument();
  });
});
