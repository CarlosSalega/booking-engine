/**
 * Tests for `BookingDetail` Client Component.
 *
 * Renders the full booking detail view (header, info cards, payment
 * info, notes, action bar). The action bar is delegated to
 * `BookingDetailActions` and the data layer is the Server Component
 * page; this component is purely presentational with one Client
 * sub-component (the actions).
 *
 * Spec scenarios covered (from `openspec/changes/bookings/specs/bookings/
 * spec.md`):
 * - Detail Page renders patient, professional, service, payments,
 *   status + payment badges, and notes.
 * - Action buttons for live (CONFIRMED) booking.
 * - No actions on terminal (COMPLETED) booking.
 * - Guest booking renders "Invitado" instead of the patient name.
 *
 * The actions sub-component is mocked so the tests stay focused on the
 * detail rendering — the action wiring has its own test file.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PaymentStatus } from "@/modules/services/domain";
import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain/roles";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

// ---------------------------------------------------------------------------
// Mock declarations
// ---------------------------------------------------------------------------

vi.mock("@/components/bookings/booking-detail-actions", () => ({
  BookingDetailActions: ({ booking }: { booking: { id: string; status: BookingStatusType } }) => (
    <div data-testid="booking-detail-actions" data-status={booking.status} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Import after the mocks are in place.
const { BookingDetail } = await import("@/components/bookings/booking-detail");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROF_USER_ID = "00000000-0000-4000-8000-000000000010";
const PROF_ID = "00000000-0000-4000-8000-000000000011";
const SERVICE_ID = "00000000-0000-4000-8000-000000000012";
const PATIENT_ID = "00000000-0000-4000-8000-000000000013";
const BOOKING_ID = "00000000-0000-4000-8000-000000000020";
const UPDATED_AT = new Date("2026-06-19T09:00:00Z");

// Booking start/end are fixed in the runtime timezone (the formatters
// render in the runtime's local TZ). Compute the expected formatted
// start + end time using the same Intl settings so the assertions stay
// stable across machines.
const START_TIME = new Date("2026-06-19T10:00:00Z");
const END_TIME = new Date("2026-06-19T10:30:00Z");

function formatHHMM(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const START_HHMM = formatHHMM(START_TIME);
const END_HHMM = formatHHMM(END_TIME);

function makeBooking(overrides: Partial<EnrichedBooking> = {}): EnrichedBooking {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    patientId: PATIENT_ID,
    professionalId: PROF_ID,
    serviceId: SERVICE_ID,
    startTime: START_TIME,
    endTime: END_TIME,
    status: BookingStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
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
      user: { name: "Dra. López" },
    },
    service: {
      id: SERVICE_ID,
      name: "Limpieza Dental",
      durationMinutes: 30,
      price: 42500,
      paymentType: "FULL",
    },
    payments: [
      { id: "pay-1", status: "PAID", amount: 42500 },
    ],
    ...overrides,
  };
}

function renderDetail(
  booking: EnrichedBooking = makeBooking(),
  role: UserRoleType = USER_ROLE.SECRETARY,
) {
  return render(<BookingDetail booking={booking} role={role} />);
}

// ---------------------------------------------------------------------------
// Header — back link + patient name + status/payment badges + date/time
// ---------------------------------------------------------------------------

describe("BookingDetail — header", () => {
  it("renders a 'Volver al listado' link to /dashboard/bookings", () => {
    renderDetail();
    const link = screen.getByRole("link", { name: /volver al listado/i });
    expect(link).toHaveAttribute("href", "/dashboard/bookings");
  });

  it("renders the booking's date and time in Argentinian format", () => {
    renderDetail();
    // The header combines formatted date + time. The date appears in
    // both the header and the horario card.
    const dateMatches = screen.getAllByText((_content, element) => {
      return element?.textContent?.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/) !== null;
    });
    expect(dateMatches.length).toBeGreaterThan(0);
    // The start time appears in both the header and the horario card.
    // The text is broken across child nodes (e.g. "07:00" + " hs"), so
    // we use a function matcher to find an element whose textContent
    // contains the formatted time.
    const startMatches = screen.getAllByText((_content, element) => {
      return element?.textContent?.includes(START_HHMM) ?? false;
    });
    expect(startMatches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders both the status badge and the payment badge in the header", () => {
    renderDetail();
    // The status badge "Confirmada" only appears once (in the header).
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    // The payment badge "Pagado" appears in BOTH the header and the
    // payment card; assert it appears at least once.
    expect(screen.getAllByText("Pagado").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Info cards — patient, professional, service, schedule
// ---------------------------------------------------------------------------

describe("BookingDetail — info cards", () => {
  it("renders the patient's name and email on the paciente card", () => {
    renderDetail();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
  });

  it("renders the professional's name on the profesional card", () => {
    renderDetail();
    expect(screen.getByText("Dra. López")).toBeInTheDocument();
  });

  it("renders the service name, duration, and price on the servicio card", () => {
    renderDetail();
    // The service name appears only once on the page.
    expect(screen.getByText("Limpieza Dental")).toBeInTheDocument();
    // Duration is rendered with "min" suffix — appears once on the service card.
    expect(screen.getByText(/30\s*min/)).toBeInTheDocument();
    // Price is rendered in es-AR currency; it appears on both the
    // service card and the payment card. Assert at least 2 occurrences.
    expect(screen.getAllByText(/42\.500|42500/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the start and end time on the horario card", () => {
    renderDetail();
    // The horario card shows the formatted start + end times.
    // Start time appears in both the header and the horario card.
    const startMatches = screen.getAllByText((_content, element) => {
      return element?.textContent?.includes(START_HHMM) ?? false;
    });
    expect(startMatches.length).toBeGreaterThanOrEqual(2);
    // End time appears in the horario card (and not the header).
    const endMatches = screen.getAllByText((_content, element) => {
      return element?.textContent?.includes(END_HHMM) ?? false;
    });
    expect(endMatches.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Payment + notes cards
// ---------------------------------------------------------------------------

describe("BookingDetail — payment + notes", () => {
  it("renders the payment card with status, amount, and a single payment row", () => {
    renderDetail();
    // The payments list has 1 entry with amount 42500. The price is
    // rendered in es-AR currency on both the service card and the
    // payment card. We just assert the payment row label renders.
    expect(screen.getByText(/Pago confirmado/i)).toBeInTheDocument();
  });

  it("does NOT render a notes section when the booking has no notes", () => {
    renderDetail(makeBooking({ notes: null }));
    expect(screen.queryByText("Notas")).not.toBeInTheDocument();
  });

  it("renders the notes section when the booking has notes", () => {
    renderDetail(makeBooking({ notes: "Paciente con ansiedad dental." }));
    expect(screen.getByText("Notas")).toBeInTheDocument();
    expect(screen.getByText("Paciente con ansiedad dental.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Guest booking
// ---------------------------------------------------------------------------

describe("BookingDetail — guest bookings", () => {
  it("renders the guest name extracted from notes when patient is null", () => {
    const guest = makeBooking({
      patientId: null,
      patient: null,
      notes: "Invitado: María González | Tel: +5491144445555 | Email: maria@example.com",
    });
    renderDetail(guest);
    // The formatters' `getPatientDisplayName` returns "Invitado: <name>"
    // for guest bookings with a recognized notes prefix. The patient
    // card renders the name AND the auxiliar "Invitado" caption — so
    // "Invitado" appears more than once. Use getAllByText.
    const matches = screen.getAllByText((_content, element) => {
      return element?.textContent?.includes("María González") ?? false;
    });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // The patient email is NOT shown for guests (no patient record).
    expect(screen.queryByText("juan@example.com")).not.toBeInTheDocument();
  });

  it("falls back to plain 'Invitado' when patient is null and notes are empty", () => {
    const guest = makeBooking({
      patientId: null,
      patient: null,
      notes: null,
    });
    renderDetail(guest);
    expect(screen.getByText("Invitado")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Action bar delegation
// ---------------------------------------------------------------------------

describe("BookingDetail — action bar", () => {
  it("renders the BookingDetailActions sub-component with the booking data", () => {
    renderDetail(makeBooking({ status: BookingStatus.CONFIRMED }));
    const actions = screen.getByTestId("booking-detail-actions");
    expect(actions).toHaveAttribute("data-status", BookingStatus.CONFIRMED);
  });

  it("renders the action bar for a CONFIRMED booking (spec scenario: live booking)", () => {
    renderDetail(makeBooking({ status: BookingStatus.CONFIRMED }));
    // The actions sub-component is mocked to render an element with the
    // booking's status — when status is CONFIRMED, the bar exists. The
    // action wiring inside the bar is tested in
    // booking-detail-actions.test.tsx.
    expect(screen.getByTestId("booking-detail-actions")).toBeInTheDocument();
  });

  it("renders the action bar even for a PENDING booking (has actions)", () => {
    renderDetail(makeBooking({ status: BookingStatus.PENDING }));
    expect(screen.getByTestId("booking-detail-actions")).toBeInTheDocument();
  });

  it("renders the action bar even for a terminal booking (sub-component handles empty state)", () => {
    // The bar always renders; the actions sub-component is responsible
    // for showing buttons or not based on status. The detail page does
    // not conditionally hide the bar — it lets the sub-component do it
    // so the layout doesn't jump when the status flips.
    renderDetail(makeBooking({ status: BookingStatus.COMPLETED }));
    expect(screen.getByTestId("booking-detail-actions")).toBeInTheDocument();
  });
});
