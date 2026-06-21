/**
 * Tests for `BookingDetailActions` Client Component.
 *
 * Renders the action buttons (Confirmar, Cancelar, Completar, No
 * asistió, Reprogramar) for a booking on the detail page. The component:
 * - Pulls the visible action set from the pure policy `getAvailableActions`
 * - Wires each button to the corresponding Server Action
 * - Shows loading state via `useTransition` while the action is in flight
 * - Toasts on success (with `router.refresh()` to re-fetch server data)
 * - Toasts on error (with the action's user-facing Spanish message)
 * - Renders the "Reprogramar" button as a placeholder (the date-picker
 *   dialog is out of scope for PR #4)
 *
 * Server Actions are mocked at the module boundary so the tests stay
 * pure RTL + jsdom. Toast is also mocked so we can assert on the calls
 * without a real DOM notification.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PaymentStatus } from "@/modules/services/domain";
import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain/roles";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

// ---------------------------------------------------------------------------
// Mock declarations — Server Actions + toast.
// ---------------------------------------------------------------------------

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

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const toastMock = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: Object.assign(
    (msg: string) => toastMock(msg),
    { success: toastSuccessMock, error: toastErrorMock },
  ),
}));

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

// Import after the mocks are in place.
const { BookingDetailActions } = await import(
  "@/components/bookings/booking-detail-actions"
);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROF_USER_ID = "00000000-0000-4000-8000-000000000010";
const PROF_ID = "00000000-0000-4000-8000-000000000011";
const SERVICE_ID = "00000000-0000-4000-8000-000000000012";
const PATIENT_ID = "00000000-0000-4000-8000-000000000013";
const BOOKING_ID = "00000000-0000-4000-8000-000000000020";
const UPDATED_AT = new Date("2026-06-19T09:00:00Z");

function makeBooking(
  status: BookingStatusType = BookingStatus.CONFIRMED,
): EnrichedBooking {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    patientId: PATIENT_ID,
    professionalId: PROF_ID,
    serviceId: SERVICE_ID,
    startTime: new Date("2026-06-19T10:00:00Z"),
    endTime: new Date("2026-06-19T10:30:00Z"),
    status,
    paymentStatus: PaymentStatus.PENDING,
    notes: null,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    patient: {
      id: PATIENT_ID,
      user: { name: "Juan Pérez", email: "juan@example.com" },
    },
    professional: {
      id: PROF_ID,
      userId: PROF_USER_ID,
      user: { name: "Dr. García" },
    },
    service: {
      id: SERVICE_ID,
      name: "Limpieza Dental",
      durationMinutes: 30,
      price: 42500,
      paymentType: "FULL",
    },
    payments: [],
  };
}

function renderActions(
  booking: EnrichedBooking,
  role: UserRoleType = USER_ROLE.SECRETARY,
) {
  return render(<BookingDetailActions booking={booking} role={role} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default success result for every action — individual tests override.
  confirmBookingMock.mockResolvedValue({ success: true });
  cancelBookingMock.mockResolvedValue({ success: true });
  completeBookingMock.mockResolvedValue({ success: true });
  markNoShowMock.mockResolvedValue({ success: true });
  rescheduleBookingMock.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Visibility — buttons per status
// ---------------------------------------------------------------------------

describe("BookingDetailActions — visibility", () => {
  it("renders [Confirmar, Cancelar] for PENDING", () => {
    renderActions(makeBooking(BookingStatus.PENDING));
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Completar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No asistió" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reprogramar" })).not.toBeInTheDocument();
  });

  it("renders [Completar, No asistió, Cancelar, Reprogramar] for CONFIRMED (the spec scenario)", () => {
    renderActions(makeBooking(BookingStatus.CONFIRMED));
    expect(screen.getByRole("button", { name: "Completar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No asistió" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
  });

  it("renders no buttons for terminal status CANCELLED", () => {
    renderActions(makeBooking(BookingStatus.CANCELLED));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders no buttons for terminal status COMPLETED", () => {
    renderActions(makeBooking(BookingStatus.COMPLETED));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders no buttons for terminal status NO_SHOW", () => {
    renderActions(makeBooking(BookingStatus.NO_SHOW));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders no buttons for terminal status RESCHEDULED", () => {
    renderActions(makeBooking(BookingStatus.RESCHEDULED));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Action wiring — clicking a button calls the right Server Action
// ---------------------------------------------------------------------------

describe("BookingDetailActions — action wiring", () => {
  it("calls confirmBooking({ bookingId }) when Confirmar is clicked on PENDING", async () => {
    const user = userEvent.setup();
    renderActions(makeBooking(BookingStatus.PENDING));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(confirmBookingMock).toHaveBeenCalledWith({ bookingId: BOOKING_ID });
    expect(confirmBookingMock).toHaveBeenCalledTimes(1);
    // The other actions must not be called.
    expect(cancelBookingMock).not.toHaveBeenCalled();
    expect(completeBookingMock).not.toHaveBeenCalled();
    expect(markNoShowMock).not.toHaveBeenCalled();
  });

  it("calls completeBooking({ bookingId }) when Completar is clicked on CONFIRMED", async () => {
    const user = userEvent.setup();
    renderActions(makeBooking(BookingStatus.CONFIRMED));
    await user.click(screen.getByRole("button", { name: "Completar" }));
    expect(completeBookingMock).toHaveBeenCalledWith({ bookingId: BOOKING_ID });
    expect(completeBookingMock).toHaveBeenCalledTimes(1);
  });

  it("calls markNoShow({ bookingId }) when No asistió is clicked on CONFIRMED", async () => {
    const user = userEvent.setup();
    renderActions(makeBooking(BookingStatus.CONFIRMED));
    await user.click(screen.getByRole("button", { name: "No asistió" }));
    expect(markNoShowMock).toHaveBeenCalledWith({ bookingId: BOOKING_ID });
    expect(markNoShowMock).toHaveBeenCalledTimes(1);
  });

  it("calls cancelBooking({ bookingId }) when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    renderActions(makeBooking(BookingStatus.PENDING));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(cancelBookingMock).toHaveBeenCalledWith({ bookingId: BOOKING_ID });
    expect(cancelBookingMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT call rescheduleBooking on click — Reprogramar is a placeholder toast", async () => {
    const user = userEvent.setup();
    renderActions(makeBooking(BookingStatus.CONFIRMED));
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));
    expect(rescheduleBookingMock).not.toHaveBeenCalled();
    // The placeholder shows an info toast (default `toast(...)`).
    expect(toastMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Success / error toasts + router.refresh
// ---------------------------------------------------------------------------

describe("BookingDetailActions — feedback", () => {
  it("shows a success toast and calls router.refresh on a successful action", async () => {
    const user = userEvent.setup();
    confirmBookingMock.mockResolvedValueOnce({ success: true });
    renderActions(makeBooking(BookingStatus.PENDING));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error toast with the action's message and does NOT refresh on failure", async () => {
    const user = userEvent.setup();
    confirmBookingMock.mockResolvedValueOnce({
      success: false,
      error: "El turno fue modificado por otro usuario. Recargá la página.",
    });
    renderActions(makeBooking(BookingStatus.PENDING));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("otro usuario"),
    );
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows a generic error toast when the action throws", async () => {
    const user = userEvent.setup();
    confirmBookingMock.mockRejectedValueOnce(new Error("network down"));
    renderActions(makeBooking(BookingStatus.PENDING));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
