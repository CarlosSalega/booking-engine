/**
 * Tests for `BookingCalendarPopover` — the shadcn `Popover` /
 * mobile `Sheet` that opens when the user clicks a calendar event.
 *
 * The popover mirrors `BookingDetailActions` for the action set:
 *
 * - Visible buttons are derived from `getAvailableActions(status, role)`
 *   so the policy lives in the pure module (and gets its own tests).
 * - Each button is wired to the matching Server Action
 *   (`confirmBooking`, `cancelBooking`, `completeBooking`,
 *   `markNoShow`, `rescheduleBooking`).
 * - "Ver detalle" is always present and pushes to
 *   `/dashboard/bookings/${id}`.
 * - On viewport ≤ 768px the popover swaps to a full-width `Sheet`
 *   (the spec calls for a bottom sheet on mobile).
 *
 * Mock strategy:
 *   - Server Actions are mocked so we can assert the dispatch
 *     without actually running them.
 *   - `useMediaQuery` is mocked so the test can flip the viewport
 *     between desktop and mobile deterministically.
 *   - `next/navigation` (useRouter) is mocked to capture
 *     `router.push` / `router.refresh` calls.
 *   - `react-hot-toast` is mocked so toasts don't pollute the test
 *     output.
 */

import "temporal-polyfill/global";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Temporal } from "temporal-polyfill";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import type { UserRoleType } from "@/modules/auth/domain/roles";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the component under test.
// ---------------------------------------------------------------------------

const useMediaQueryMock = vi.fn().mockReturnValue(false);
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: useMediaQueryMock,
}));

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const confirmBookingMock = vi.fn();
const cancelBookingMock = vi.fn();
const completeBookingMock = vi.fn();
const markNoShowMock = vi.fn();
const rescheduleBookingMock = vi.fn();
vi.mock("@/modules/bookings/actions", () => ({
  confirmBooking: confirmBookingMock,
  cancelBooking: cancelBookingMock,
  completeBooking: completeBookingMock,
  markNoShow: markNoShowMock,
  rescheduleBooking: rescheduleBookingMock,
}));

const { BookingCalendarPopover } = await import(
  "../booking-calendar-popover"
);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

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
    status: BookingStatus.PENDING,
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

function makeCalendarEvent(booking: EnrichedBooking) {
  return {
    id: booking.id,
    title: booking.patient?.user.name ?? "Invitado",
    description: booking.service.name,
    // Bridge: Instant.from(iso) → toZonedDateTimeISO(tz). Mirrors the
    // mapper in `booking-calendar-utils.ts`. The bare ISO string is
    // a UTC instant; `ZonedDateTime.from` cannot parse it without
    // a bracket-annotation, so we go through `Instant`.
    start: Temporal.Instant.from(
      booking.startTime.toISOString(),
    ).toZonedDateTimeISO("America/Argentina/Buenos_Aires"),
    end: Temporal.Instant.from(
      booking.endTime.toISOString(),
    ).toZonedDateTimeISO("America/Argentina/Buenos_Aires"),
    calendarId: booking.status,
    _booking: booking,
  };
}

const ADMIN_ROLE: UserRoleType = "ADMIN";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: desktop viewport, all server actions return success.
  useMediaQueryMock.mockReturnValue(false);
  confirmBookingMock.mockResolvedValue({ success: true });
  cancelBookingMock.mockResolvedValue({ success: true });
  completeBookingMock.mockResolvedValue({ success: true });
  markNoShowMock.mockResolvedValue({ success: true });
  rescheduleBookingMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
});

describe("BookingCalendarPopover — PENDING booking (desktop)", () => {
  it("renders patient name, service, and the time range in the header", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Limpieza Dental")).toBeInTheDocument();
    // 13:00 UTC → 10:00 in America/Argentina/Buenos_Aires (UTC-03:00).
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  it("shows Confirmar, Cancelar, Reprogramar, and Ver detalle for PENDING", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Confirmar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cancelar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reprogramar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver detalle/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show Completar or No asistió for PENDING", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Completar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /No asisti/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking Confirmar calls confirmBooking and triggers router.refresh", async () => {
    const user = userEvent.setup();
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Confirmar/i }));

    expect(confirmBookingMock).toHaveBeenCalledWith({ bookingId: "b1" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("clicking Cancelar calls cancelBooking and triggers router.refresh", async () => {
    const user = userEvent.setup();
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(cancelBookingMock).toHaveBeenCalledWith({ bookingId: "b1" });
    expect(refreshMock).toHaveBeenCalled();
  });
});

describe("BookingCalendarPopover — COMPLETED booking", () => {
  it("shows only Ver detalle (no transition actions)", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.COMPLETED });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Ver detalle/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Confirmar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancelar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reprogramar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Completar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /No asisti/i }),
    ).not.toBeInTheDocument();
  });
});

describe("BookingCalendarPopover — CONFIRMED booking", () => {
  it("shows Completar, No asistió, Cancelar, Reprogramar, Ver detalle", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.CONFIRMED });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Completar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /No asisti/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cancelar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reprogramar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver detalle/i }),
    ).toBeInTheDocument();
  });

  it("clicking Completar calls completeBooking", async () => {
    const user = userEvent.setup();
    const booking = makeEnrichedBooking({ status: BookingStatus.CONFIRMED });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Completar/i }));

    expect(completeBookingMock).toHaveBeenCalledWith({ bookingId: "b1" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("clicking No asistió calls markNoShow", async () => {
    const user = userEvent.setup();
    const booking = makeEnrichedBooking({ status: BookingStatus.CONFIRMED });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /No asisti/i }));

    expect(markNoShowMock).toHaveBeenCalledWith({ bookingId: "b1" });
    expect(refreshMock).toHaveBeenCalled();
  });
});

describe("BookingCalendarPopover — Ver detalle navigation", () => {
  it("clicking Ver detalle calls router.push('/dashboard/bookings/${id}')", async () => {
    const user = userEvent.setup();
    const booking = makeEnrichedBooking({ status: BookingStatus.COMPLETED });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Ver detalle/i }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard/bookings/b1");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("BookingCalendarPopover — mobile (≤768px) renders Sheet", () => {
  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(true);
  });

  it("renders the Sheet variant instead of the Popover", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    // The Sheet exposes a `data-testid="booking-calendar-sheet"`
    // content element when the mobile variant is active.
    expect(
      screen.getByTestId("booking-calendar-sheet"),
    ).toBeInTheDocument();
    // The popover content should NOT be present in the mobile variant.
    expect(
      screen.queryByTestId("booking-calendar-popover"),
    ).not.toBeInTheDocument();
  });

  it("still shows all the action buttons in the mobile sheet", () => {
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Confirmar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cancelar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reprogramar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver detalle/i }),
    ).toBeInTheDocument();
  });
});

describe("BookingCalendarPopover — server action error", () => {
  it("does not call router.refresh when the server action returns failure", async () => {
    const user = userEvent.setup();
    confirmBookingMock.mockResolvedValueOnce({
      success: false,
      error: "No se pudo confirmar",
    });
    const booking = makeEnrichedBooking({ status: BookingStatus.PENDING });
    render(
      <BookingCalendarPopover
        event={makeCalendarEvent(booking)}
        role={ADMIN_ROLE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Confirmar/i }));

    expect(confirmBookingMock).toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

// Type-only assertion: the visible button set is derived from the
// (status, role) policy; the tests above cover the four key scenarios.
const _statusesCovered: BookingStatusType[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];
void _statusesCovered;
