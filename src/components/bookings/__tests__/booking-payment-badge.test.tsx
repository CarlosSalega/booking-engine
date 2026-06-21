/**
 * Tests for the `BookingPaymentBadge` Client Component.
 *
 * Renders a payment status with the right Argentinian Spanish label
 * and the right color variant. The variant map is exported as a
 * constant so other components (e.g. the table) can reference it.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PaymentStatus, type PaymentStatusType } from "@/modules/services/domain";

import {
  BookingPaymentBadge,
  BOOKING_PAYMENT_BADGE_VARIANT,
} from "@/components/bookings/booking-payment-badge";

describe("BOOKING_PAYMENT_BADGE_VARIANT", () => {
  it("maps PAID → default (green in app CSS)", () => {
    expect(BOOKING_PAYMENT_BADGE_VARIANT[PaymentStatus.PAID]).toBe("default");
  });

  it("maps PENDING → outline (yellow in app CSS)", () => {
    expect(BOOKING_PAYMENT_BADGE_VARIANT[PaymentStatus.PENDING]).toBe("outline");
  });

  it("maps FAILED → destructive (red in app CSS)", () => {
    expect(BOOKING_PAYMENT_BADGE_VARIANT[PaymentStatus.FAILED]).toBe(
      "destructive",
    );
  });

  it("maps REFUNDED → secondary (blue in app CSS)", () => {
    expect(BOOKING_PAYMENT_BADGE_VARIANT[PaymentStatus.REFUNDED]).toBe(
      "secondary",
    );
  });

  it("maps PARTIALLY_REFUNDED → secondary (blue in app CSS)", () => {
    expect(
      BOOKING_PAYMENT_BADGE_VARIANT[PaymentStatus.PARTIALLY_REFUNDED],
    ).toBe("secondary");
  });

  it("covers all 5 PaymentStatus values (exhaustive)", () => {
    const all: PaymentStatusType[] = [
      PaymentStatus.PAID,
      PaymentStatus.PENDING,
      PaymentStatus.FAILED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ];
    for (const status of all) {
      expect(BOOKING_PAYMENT_BADGE_VARIANT[status]).toBeTruthy();
    }
  });
});

describe("BookingPaymentBadge", () => {
  it("renders 'Pagado' for PAID", () => {
    render(<BookingPaymentBadge status={PaymentStatus.PAID} />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  it("renders 'Pendiente' for PENDING", () => {
    render(<BookingPaymentBadge status={PaymentStatus.PENDING} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("renders 'Fallido' for FAILED", () => {
    render(<BookingPaymentBadge status={PaymentStatus.FAILED} />);
    expect(screen.getByText("Fallido")).toBeInTheDocument();
  });

  it("renders 'Reembolsado' for REFUNDED", () => {
    render(<BookingPaymentBadge status={PaymentStatus.REFUNDED} />);
    expect(screen.getByText("Reembolsado")).toBeInTheDocument();
  });

  it("renders 'Parcial' for PARTIALLY_REFUNDED", () => {
    render(
      <BookingPaymentBadge status={PaymentStatus.PARTIALLY_REFUNDED} />,
    );
    expect(screen.getByText("Parcial")).toBeInTheDocument();
  });

  it("applies the correct variant attribute (data-variant) for PAID", () => {
    render(<BookingPaymentBadge status={PaymentStatus.PAID} />);
    const badge = screen.getByText("Pagado");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("applies destructive variant for FAILED", () => {
    render(<BookingPaymentBadge status={PaymentStatus.FAILED} />);
    const badge = screen.getByText("Fallido");
    expect(badge).toHaveAttribute("data-variant", "destructive");
  });
});
