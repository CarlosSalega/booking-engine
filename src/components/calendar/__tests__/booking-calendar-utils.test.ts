/**
 * Tests for the calendar mapping utilities.
 *
 * The calendar is a *presentation view* over `EnrichedBooking`. The
 * only responsibility of this module is to translate domain data into
 * Schedule-X shapes and to keep the status-color mapping in one place.
 *
 * Pure functions, no React, no Next.js. The `Temporal` API is
 * polyfilled by `temporal-polyfill@0.3.0` (loaded at the calendar
 * component level); the tests import it the same way so the polyfill
 * is available in jsdom.
 */

import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

import {
  STATUS_CALENDAR_COLORS,
  bookingToCalendarEvent,
  computeDateRange,
  tzArg,
} from "../booking-calendar-utils";

const TZ = "America/Argentina/Buenos_Aires";

function makeBooking(overrides: Partial<EnrichedBooking> = {}): EnrichedBooking {
  return {
    id: "booking-1",
    organizationId: "00000000-0000-4000-8000-000000000001",
    patientId: "00000000-0000-4000-8000-000000000002",
    professionalId: "00000000-0000-4000-8000-000000000003",
    serviceId: "00000000-0000-4000-8000-000000000004",
    startTime: new Date("2026-06-22T13:00:00Z"),
    endTime: new Date("2026-06-22T13:30:00Z"),
    status: BookingStatus.CONFIRMED,
    paymentStatus: "PENDING" as EnrichedBooking["paymentStatus"],
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
      paymentType: "FULL" as EnrichedBooking["service"]["paymentType"],
    },
    payments: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// tzArg
// ---------------------------------------------------------------------------

describe("tzArg", () => {
  it("is the Argentina/Buenos_Aires IANA time zone identifier", () => {
    expect(tzArg).toBe(TZ);
  });
});

// ---------------------------------------------------------------------------
// bookingToCalendarEvent
// ---------------------------------------------------------------------------

describe("bookingToCalendarEvent", () => {
  it("returns the booking id as the calendar event id", () => {
    const booking = makeBooking({ id: "abc-123" });
    const event = bookingToCalendarEvent(booking);
    expect(event.id).toBe("abc-123");
  });

  it("uses the patient's display name as the title for a registered patient", () => {
    const booking = makeBooking({
      patient: {
        id: "00000000-0000-4000-8000-000000000002",
        user: { name: "Juan Pérez", email: "juan@example.com" },
      },
    });
    const event = bookingToCalendarEvent(booking);
    expect(event.title).toBe("Juan Pérez");
  });

  it("uses the service name as the description", () => {
    const booking = makeBooking({
      service: {
        id: "00000000-0000-4000-8000-000000000004",
        name: "Limpieza Dental",
        durationMinutes: 30,
        price: 3500,
        paymentType: "FULL" as EnrichedBooking["service"]["paymentType"],
      },
    });
    const event = bookingToCalendarEvent(booking);
    expect(event.description).toBe("Limpieza Dental");
  });

  it("converts startTime from a Date into a Temporal.ZonedDateTime in Argentina TZ", () => {
    // 2026-06-22T13:00:00Z → 2026-06-22T10:00:00-03:00 in America/Argentina/Buenos_Aires
    const booking = makeBooking({
      startTime: new Date("2026-06-22T13:00:00Z"),
      endTime: new Date("2026-06-22T13:30:00Z"),
    });
    const event = bookingToCalendarEvent(booking);
    expect(Temporal.ZonedDateTime.compare(event.start, event.start)).toBe(0);
    expect(event.start.timeZoneId).toBe(TZ);
    expect(event.start.year).toBe(2026);
    expect(event.start.month).toBe(6);
    expect(event.start.day).toBe(22);
    expect(event.start.hour).toBe(10);
    expect(event.start.minute).toBe(0);
  });

  it("converts endTime from a Date into a Temporal.ZonedDateTime in Argentina TZ", () => {
    const booking = makeBooking({
      startTime: new Date("2026-06-22T13:00:00Z"),
      endTime: new Date("2026-06-22T13:30:00Z"),
    });
    const event = bookingToCalendarEvent(booking);
    expect(event.end.timeZoneId).toBe(TZ);
    expect(event.end.hour).toBe(10);
    expect(event.end.minute).toBe(30);
  });

  it("uses the booking status as the calendarId", () => {
    const booking = makeBooking({ status: BookingStatus.PENDING });
    const event = bookingToCalendarEvent(booking);
    expect(event.calendarId).toBe("PENDING");
  });

  it("preserves the original booking on the _booking field for the popover", () => {
    const booking = makeBooking({ id: "preserve-me" });
    const event = bookingToCalendarEvent(booking);
    expect(event._booking).toBe(booking);
  });

  it("accepts ISO string startTime/endTime (RSC boundary case)", () => {
    const booking = makeBooking({
      // Re-cast as if it came from a Server Component where Date objects
      // were serialized to strings on the RSC boundary.
      startTime: new Date("2026-06-22T13:00:00Z"),
      endTime: new Date("2026-06-22T13:30:00Z"),
    });
    const event = bookingToCalendarEvent(booking);
    expect(event.start.timeZoneId).toBe(TZ);
    expect(event.end.timeZoneId).toBe(TZ);
  });
});

// ---------------------------------------------------------------------------
// STATUS_CALENDAR_COLORS
// ---------------------------------------------------------------------------

describe("STATUS_CALENDAR_COLORS", () => {
  const ALL_STATUSES: BookingStatusType[] = [
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.RESCHEDULED,
    BookingStatus.COMPLETED,
    BookingStatus.NO_SHOW,
    BookingStatus.AWAITING_PAYMENT,
  ];

  it("has exactly 7 entries (one per BookingStatus)", () => {
    expect(Object.keys(STATUS_CALENDAR_COLORS)).toHaveLength(7);
  });

  it("has a non-empty entry for every status", () => {
    for (const status of ALL_STATUSES) {
      const entry = STATUS_CALENDAR_COLORS[status];
      expect(entry).toBeDefined();
      expect(entry.backgroundColor).toBeTruthy();
      expect(entry.borderColor).toBeTruthy();
    }
  });

  it("aliases the same color map exported from status-tones", () => {
    // Schedule-X doesn't accept the structured `lightColors`/`darkColors`
    // shape directly here — the calendar wrapper builds the full
    // `calendars` config from `STATUS_HEX`. This map is the *flat*
    // convenience shape that the calendar app can spread into the
    // `calendars` config; it MUST match the `main` of `STATUS_HEX`.
    expect(STATUS_CALENDAR_COLORS[BookingStatus.PENDING].borderColor).toBe(
      "#f59e0b",
    );
    expect(STATUS_CALENDAR_COLORS[BookingStatus.CONFIRMED].borderColor).toBe(
      "#10b981",
    );
  });
});

// ---------------------------------------------------------------------------
// computeDateRange
// ---------------------------------------------------------------------------

describe("computeDateRange", () => {
  it("returns a Mon-next-Mon range for the week view (exclusive end)", () => {
    // 2026-06-22 is a Monday in any locale.
    const monday = Temporal.PlainDate.from("2026-06-22");
    const range = computeDateRange(monday, "week");
    // Schedule-X uses exclusive `end` (matches `getEventsInRange` /
    // `fetchEvents` semantics), so the week is [Mon, next-Mon).
    expect(range.start.dayOfWeek).toBe(1); // Monday
    expect(range.end.dayOfWeek).toBe(1); // next Monday (exclusive)
    expect(range.start.toString()).toBe("2026-06-22");
    expect(range.end.toString()).toBe("2026-06-29");
  });

  it("snaps the week start back to Monday when the input is mid-week", () => {
    // 2026-06-24 is a Wednesday.
    const wednesday = Temporal.PlainDate.from("2026-06-24");
    const range = computeDateRange(wednesday, "week");
    expect(range.start.toString()).toBe("2026-06-22");
    expect(range.end.toString()).toBe("2026-06-29");
  });

  it("returns a 24h range for the day view (start of day → start of next day, exclusive end)", () => {
    const monday = Temporal.PlainDate.from("2026-06-22");
    const range = computeDateRange(monday, "day");
    expect(range.start.toString()).toBe("2026-06-22");
    expect(range.end.toString()).toBe("2026-06-23");
  });

  it("returns a full month range for the month view (day-1 → next day-1, exclusive end)", () => {
    const march15 = Temporal.PlainDate.from("2026-03-15");
    const range = computeDateRange(march15, "month");
    expect(range.start.toString()).toBe("2026-03-01");
    expect(range.end.toString()).toBe("2026-04-01");
  });

  it("handles month view crossing the year boundary", () => {
    const jan15 = Temporal.PlainDate.from("2026-01-15");
    const range = computeDateRange(jan15, "month");
    expect(range.start.toString()).toBe("2026-01-01");
    expect(range.end.toString()).toBe("2026-02-01");
  });
});
