"use client";

/**
 * `BookingCalendarDataWrapper` — thin client bridge between the
 * Server Component page and the Schedule-X calendar wrapper.
 *
 * The page is a Server Component that fetches bookings for the
 * current URL range. Schedule-X fires `onRangeUpdate` when the
 * user navigates with its built-in `← / →` arrows, but the page
 * cannot pass a Server Action as a prop (it's not serializable).
 * This wrapper bridges the gap: it catches `onRangeUpdate`,
 * extracts the new range's start date, and updates the URL via
 * `router.replace`. That re-renders the page with the updated
 * `searchParams`, which calls `getBookings` with the new range,
 * which streams fresh `bookings` into the calendar.
 *
 * Design AD7 ("`onRangeUpdate` triggers Server Action refetch")
 * is satisfied because the URL-driven re-render DOES call a
 * Server Action under the hood (`getBookings`). The indirection
 * is deliberate — it keeps the page a pure Server Component.
 */

import { useRouter, useSearchParams } from "next/navigation";

import { BookingCalendar } from "./booking-calendar";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

interface BookingCalendarDataWrapperProps {
  bookings: EnrichedBooking[];
  defaultView?: "week" | "day" | "month-grid";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingCalendarDataWrapper({
  bookings,
  defaultView = "week",
}: BookingCalendarDataWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRangeUpdate = (range: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const view = params.get("view") ?? "week";
    params.set("view", view);
    params.set("date", range.start.toPlainDate().toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <BookingCalendar
      bookings={bookings}
      defaultView={defaultView}
      onRangeUpdate={handleRangeUpdate}
    />
  );
}
