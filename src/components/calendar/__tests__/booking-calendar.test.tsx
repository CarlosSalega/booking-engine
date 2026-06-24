/**
 * Tests for the `BookingCalendar` Client Component.
 *
 * The calendar is a thin wrapper around Schedule-X's `useNextCalendarApp`
 * that:
 *   1. Maps enriched bookings to Schedule-X events.
 *   2. Builds the `calendars` config from `STATUS_CALENDAR_COLORS` (one
 *      per booking status) so events inherit their color from
 *      `event.calendarId = booking.status`.
 *   3. Wires the three views (week, day, month), the es-AR locale, and
 *      the Monday-first week.
 *   4. Exposes `onEventClick` and `onRangeUpdate` callbacks to the
 *      parent (popover + refetch are wired in PR #2).
 *
 * `useNextCalendarApp` mutates the global `Temporal` object via the
 * `temporal-polyfill/global` side-effect import. We mock the entire
 * `@schedule-x/react` module so the test does not need to render the
 * real calendar in jsdom — only the wrapper's *contract* is under test.
 */

import "temporal-polyfill/global";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

const mocks = vi.hoisted(() => ({
  useMediaQueryMock: vi.fn().mockReturnValue(false),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mocks.useMediaQueryMock,
}));

// ---------------------------------------------------------------------------
// Mock @schedule-x/react BEFORE importing the component.
// We assert on the args the wrapper passes to useNextCalendarApp and
// render a placeholder instead of the real ScheduleXCalendar.
// ---------------------------------------------------------------------------

const useNextCalendarAppMock = vi.fn();
const ScheduleXCalendarMock = vi.fn(
  ({
    customComponents,
  }: {
    calendarApp: unknown;
    customComponents?: Record<string, unknown>;
  }) => (
    <div
      data-testid="schedule-x-calendar-mock"
      data-custom-month-event={
        typeof customComponents?.["monthGridEvent"] === "function"
          ? "present"
          : "absent"
      }
    />
  ),
);

vi.mock("@schedule-x/react", () => ({
  useNextCalendarApp: (...args: unknown[]) => useNextCalendarAppMock(...args),
  ScheduleXCalendar: ScheduleXCalendarMock,
}));

// vi.mock the theme CSS import — the test environment has no bundler
// resolution for it and the wrapper imports it for side-effect.
vi.mock("@schedule-x/theme-default/dist/index.css", () => ({ default: "" }));

const { BookingCalendar } = await import("../booking-calendar");

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

const bookings: EnrichedBooking[] = [
  makeEnrichedBooking({ id: "b1", status: BookingStatus.CONFIRMED }),
  makeEnrichedBooking({ id: "b2", status: BookingStatus.PENDING }),
];

beforeEach(() => {
  useNextCalendarAppMock.mockReset();
  ScheduleXCalendarMock.mockClear();
  // The mock returns a fake CalendarApp; the wrapper just hands it to
  // <ScheduleXCalendar> which our mock renders to a stub div.
  useNextCalendarAppMock.mockReturnValue({ __fakeApp: true });
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// useNextCalendarApp config — the contract under test
// ---------------------------------------------------------------------------

function getConfig() {
  expect(useNextCalendarAppMock).toHaveBeenCalledTimes(1);
  const arg = useNextCalendarAppMock.mock.calls[0]?.[0] as Record<string, unknown>;
  return arg;
}

describe("BookingCalendar — useNextCalendarApp config", () => {
  it("passes the bookings converted to Schedule-X events", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    const events = config["events"] as Array<{ id: string; calendarId: string }>;
    expect(events).toHaveLength(2);
    expect(events[0]?.id).toBe("b1");
    expect(events[0]?.calendarId).toBe("CONFIRMED");
    expect(events[1]?.id).toBe("b2");
    expect(events[1]?.calendarId).toBe("PENDING");
  });

  it("converts each booking's start/end to a Temporal.ZonedDateTime", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    const events = config["events"] as Array<{
      start: Temporal.ZonedDateTime;
      end: Temporal.ZonedDateTime;
    }>;
    const first = events[0]!;
    expect(Temporal.ZonedDateTime.compare(first.start, first.start)).toBe(0);
    expect(first.start.timeZoneId).toBe("America/Argentina/Buenos_Aires");
  });

  it("uses the Argentinian Spanish locale", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    expect(config["locale"]).toBe("es-AR");
  });

  it("starts the week on Monday (firstDayOfWeek: 1)", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    expect(config["firstDayOfWeek"]).toBe(1);
  });

  it("configures exactly 3 views: week, day, monthGrid", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    const views = config["views"] as Array<{ name: string }>;
    const viewNames = views.map((v) => v.name);
    expect(viewNames).toEqual(
      expect.arrayContaining(["week", "day", "month-grid"]),
    );
    expect(viewNames).toHaveLength(3);
  });

  it("builds the calendars config with one entry per BookingStatus (7 entries)", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    const calendars = config["calendars"] as Record<string, { colorName: string; lightColors: unknown; darkColors: unknown }>;
    expect(Object.keys(calendars)).toHaveLength(7);
    for (const status of Object.values(BookingStatus)) {
      expect(calendars[status]).toBeDefined();
      expect(calendars[status]?.colorName).toBe(status);
      expect(calendars[status]?.lightColors).toBeDefined();
      expect(calendars[status]?.darkColors).toBeDefined();
    }
  });

  it("PENDING calendar's lightColors.main is the amber hex (#f59e0b)", () => {
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    const calendars = config["calendars"] as Record<BookingStatusType, { lightColors: { main: string } }>;
    expect(calendars[BookingStatus.PENDING].lightColors.main.toLowerCase()).toBe(
      "#f59e0b",
    );
  });
});

// ---------------------------------------------------------------------------
// onEventClick callback
// ---------------------------------------------------------------------------

describe("BookingCalendar — onEventClick callback", () => {
  it("is wired to the parent's onEventClick prop", () => {
    const parentClick = vi.fn();
    render(<BookingCalendar bookings={bookings} onEventClick={parentClick} />);
    const config = getConfig();
    const callbacks = config["callbacks"] as { onEventClick: (e: unknown, ev: unknown) => void };
    expect(typeof callbacks.onEventClick).toBe("function");

    // Schedule-X calls onEventClick(event, nativeEvent). The wrapper
    // forwards the Schedule-X event (with the `_booking` ref) straight
    // to the parent — that's the contract the popover relies on.
    const sxEvent = { id: "b1", _booking: bookings[0] };
    callbacks.onEventClick(sxEvent, {});
    expect(parentClick).toHaveBeenCalledWith(sxEvent);
  });
});

// ---------------------------------------------------------------------------
// onRangeUpdate callback
// ---------------------------------------------------------------------------

describe("BookingCalendar — onRangeUpdate callback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is wired to the parent's onRangeUpdate prop with the new range (after debounce)", () => {
    const parentRange = vi.fn();
    render(<BookingCalendar bookings={bookings} onRangeUpdate={parentRange} />);
    const config = getConfig();
    const callbacks = config["callbacks"] as { onRangeUpdate: (range: unknown) => void };
    expect(typeof callbacks.onRangeUpdate).toBe("function");

    const range = { start: "2026-06-22", end: "2026-06-29" };
    callbacks.onRangeUpdate(range);

    // The wrapper debounces onRangeUpdate by 200ms. Advance the
    // fake timer past the debounce window so the callback fires.
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(parentRange).toHaveBeenCalledWith(range);
  });
});

// ---------------------------------------------------------------------------
// Rendering — placeholder event is rendered via the mocked ScheduleXCalendar
// ---------------------------------------------------------------------------

describe("BookingCalendar — rendering", () => {
  it("renders a single calendar container that the parent can size", () => {
    render(<BookingCalendar bookings={bookings} />);
    // The mocked ScheduleXCalendar renders a stub div; the wrapper
    // also renders an outer container with a fixed class for CSS height.
    const container = document.querySelector(".sx-react-calendar-wrapper");
    expect(container).toBeInTheDocument();
  });

  it("renders the mocked ScheduleXCalendar component", () => {
    render(<BookingCalendar bookings={bookings} />);
    expect(
      screen.getByTestId("schedule-x-calendar-mock"),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PR #2 additions — onRangeUpdate debounce, mobile default view, month grid
// ---------------------------------------------------------------------------

describe("BookingCalendar — onRangeUpdate debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces consecutive onRangeUpdate calls within 200ms", () => {
    const parentRange = vi.fn();
    render(<BookingCalendar bookings={bookings} onRangeUpdate={parentRange} />);
    const config = getConfig();
    const callbacks = config["callbacks"] as {
      onRangeUpdate: (range: unknown) => void;
    };

    // Three rapid navigation clicks. The wrapper must collapse
    // them into ONE onRangeUpdate call (the final range), not
    // three.
    callbacks.onRangeUpdate({ start: "2026-06-22", end: "2026-06-29" });
    callbacks.onRangeUpdate({ start: "2026-06-29", end: "2026-07-06" });
    callbacks.onRangeUpdate({ start: "2026-07-06", end: "2026-07-13" });

    // Within the debounce window, no calls have been made yet.
    expect(parentRange).not.toHaveBeenCalled();

    // After the debounce delay, exactly one call has been emitted
    // with the LATEST range.
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(parentRange).toHaveBeenCalledTimes(1);
    expect(parentRange).toHaveBeenCalledWith({
      start: "2026-07-06",
      end: "2026-07-13",
    });
  });

  it("emits the FIRST call after the debounce window elapses (no trailing suppression)", () => {
    const parentRange = vi.fn();
    render(<BookingCalendar bookings={bookings} onRangeUpdate={parentRange} />);
    const config = getConfig();
    const callbacks = config["callbacks"] as {
      onRangeUpdate: (range: unknown) => void;
    };

    callbacks.onRangeUpdate({ start: "2026-06-22", end: "2026-06-29" });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(parentRange).toHaveBeenCalledTimes(1);

    // A second call, after the first debounce window, must also fire.
    callbacks.onRangeUpdate({ start: "2026-06-29", end: "2026-07-06" });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(parentRange).toHaveBeenCalledTimes(2);
  });
});

describe("BookingCalendar — mobile default view", () => {
  afterEach(() => {
    mocks.useMediaQueryMock.mockReturnValue(false);
  });

  it("defaults to 'day' view on mobile (≤ 768px) when no defaultView prop is provided", () => {
    mocks.useMediaQueryMock.mockReturnValue(true);
    render(<BookingCalendar bookings={bookings} />);
    const config = getConfig();
    expect(config["defaultView"]).toBe("day");
  });

  it("keeps the URL/explicit defaultView on desktop even when the prop is 'week'", () => {
    mocks.useMediaQueryMock.mockReturnValue(false);
    render(<BookingCalendar bookings={bookings} defaultView="week" />);
    const config = getConfig();
    expect(config["defaultView"]).toBe("week");
  });

  it("forces 'day' on mobile even when the prop is 'month-grid'", () => {
    // Mobile UX trumps the URL view — the wrapper always defaults
    // to 'day' on small screens so the user sees a usable layout
    // without horizontal scrolling.
    mocks.useMediaQueryMock.mockReturnValue(true);
    render(<BookingCalendar bookings={bookings} defaultView="month-grid" />);
    const config = getConfig();
    expect(config["defaultView"]).toBe("day");
  });
});

describe("BookingCalendar — month grid event handler", () => {
  it("passes the dot-only month event component as the monthGridEvent", () => {
    render(<BookingCalendar bookings={bookings} />);
    // The wrapper registers the dot-only `BookingCalendarMonthEvent`
    // for the month grid. Schedule-X's day cell uses it to render
    // the count indicator. The mock surfaces the registration via
    // a `data-custom-month-event` attribute so we don't need to
    // poke at internals.
    const mock = screen.getByTestId("schedule-x-calendar-mock");
    expect(mock.getAttribute("data-custom-month-event")).toBe("present");
  });
});
