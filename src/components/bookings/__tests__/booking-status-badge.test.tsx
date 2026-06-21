/**
 * Tests for the `BookingStatusBadge` Client Component.
 *
 * Strategy: render the component with @testing-library/react and
 * assert the rendered label and the badge variant prop. The component
 * is small enough that we can render it directly without mocking
 * — no Next.js router, no auth, no Prisma.
 *
 * The test covers all 7 BookingStatus values + a snapshot of the
 * expected variant map. The variant is exported as a constant so
 * consumers (e.g. tests for the table) can reference it directly.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";

import {
  BookingStatusBadge,
  BOOKING_STATUS_BADGE_VARIANT,
} from "@/components/bookings/booking-status-badge";

describe("BOOKING_STATUS_BADGE_VARIANT", () => {
  it("maps PENDING → outline (yellow-ish in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.PENDING]).toBe("outline");
  });

  it("maps CONFIRMED → default (green in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.CONFIRMED]).toBe("default");
  });

  it("maps CANCELLED → destructive (red in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.CANCELLED]).toBe(
      "destructive",
    );
  });

  it("maps RESCHEDULED → secondary (blue in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.RESCHEDULED]).toBe(
      "secondary",
    );
  });

  it("maps COMPLETED → default (green in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.COMPLETED]).toBe(
      "default",
    );
  });

  it("maps NO_SHOW → destructive (red in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.NO_SHOW]).toBe(
      "destructive",
    );
  });

  it("maps AWAITING_PAYMENT → outline (orange in app CSS)", () => {
    expect(BOOKING_STATUS_BADGE_VARIANT[BookingStatus.AWAITING_PAYMENT]).toBe(
      "outline",
    );
  });

  it("covers all 7 BookingStatus values (exhaustive)", () => {
    const all: BookingStatusType[] = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
      BookingStatus.AWAITING_PAYMENT,
    ];
    for (const status of all) {
      expect(BOOKING_STATUS_BADGE_VARIANT[status]).toBeTruthy();
    }
  });
});

describe("BookingStatusBadge", () => {
  it("renders the Spanish label for PENDING", () => {
    render(<BookingStatusBadge status={BookingStatus.PENDING} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("renders the Spanish label for CONFIRMED", () => {
    render(<BookingStatusBadge status={BookingStatus.CONFIRMED} />);
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
  });

  it("renders the Spanish label for CANCELLED", () => {
    render(<BookingStatusBadge status={BookingStatus.CANCELLED} />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("renders the Spanish label for RESCHEDULED", () => {
    render(<BookingStatusBadge status={BookingStatus.RESCHEDULED} />);
    expect(screen.getByText("Reprogramada")).toBeInTheDocument();
  });

  it("renders the Spanish label for COMPLETED", () => {
    render(<BookingStatusBadge status={BookingStatus.COMPLETED} />);
    expect(screen.getByText("Completada")).toBeInTheDocument();
  });

  it("renders the Spanish label for NO_SHOW", () => {
    render(<BookingStatusBadge status={BookingStatus.NO_SHOW} />);
    expect(screen.getByText("No asistió")).toBeInTheDocument();
  });

  it("renders the Spanish label for AWAITING_PAYMENT", () => {
    render(
      <BookingStatusBadge status={BookingStatus.AWAITING_PAYMENT} />,
    );
    expect(screen.getByText("Esperando pago")).toBeInTheDocument();
  });

  it("renders the badge with the matching variant attribute (data-variant)", () => {
    render(<BookingStatusBadge status={BookingStatus.CONFIRMED} />);
    const badge = screen.getByText("Confirmada");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("renders a destructive badge for CANCELLED", () => {
    render(<BookingStatusBadge status={BookingStatus.CANCELLED} />);
    const badge = screen.getByText("Cancelada");
    expect(badge).toHaveAttribute("data-variant", "destructive");
  });
});
