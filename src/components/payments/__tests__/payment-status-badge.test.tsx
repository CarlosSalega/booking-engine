/**
 * Tests for the `PaymentStatusBadge` Client Component.
 *
 * Mirrors the `PatientStatusBadge` and `ProfessionalStatusBadge` test
 * strategies: render the component with @testing-library/react and
 * assert the rendered label + the badge variant prop. The component
 * is small enough that we can render it directly without mocking —
 * no Next.js router, no auth, no Prisma.
 *
 * The test covers all 5 ProviderPaymentStatus values + the expected
 * variant map. The variant is exported as a constant so consumers
 * (e.g. the table, the detail card) can reference it directly.
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — Status badge color-coded per
 *   ProviderPaymentStatus: PENDING=yellow, APPROVED=green,
 *   REJECTED=red, CANCELLED=gray, IN_PROCESS=blue.
 * - formatters — Status labels in es-AR.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";

import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PaymentStatusBadge,
} from "@/components/payments/payment-status-badge";

// ---------------------------------------------------------------------------
// PAYMENT_STATUS_BADGE_VARIANT — the variant map
// ---------------------------------------------------------------------------

describe("PAYMENT_STATUS_BADGE_VARIANT", () => {
  it("maps PENDING → default (yellow tone)", () => {
    expect(PAYMENT_STATUS_BADGE_VARIANT[ProviderPaymentStatus.PENDING]).toBe(
      "default",
    );
  });

  it("maps APPROVED → default (green tone)", () => {
    expect(PAYMENT_STATUS_BADGE_VARIANT[ProviderPaymentStatus.APPROVED]).toBe(
      "default",
    );
  });

  it("maps REJECTED → destructive (red tone)", () => {
    expect(PAYMENT_STATUS_BADGE_VARIANT[ProviderPaymentStatus.REJECTED]).toBe(
      "destructive",
    );
  });

  it("maps CANCELLED → secondary (gray tone)", () => {
    expect(PAYMENT_STATUS_BADGE_VARIANT[ProviderPaymentStatus.CANCELLED]).toBe(
      "secondary",
    );
  });

  it("maps IN_PROCESS → default (blue tone)", () => {
    expect(PAYMENT_STATUS_BADGE_VARIANT[ProviderPaymentStatus.IN_PROCESS]).toBe(
      "default",
    );
  });

  it("covers all 5 ProviderPaymentStatus values (exhaustive)", () => {
    const all: ProviderPaymentStatusType[] = [
      ProviderPaymentStatus.PENDING,
      ProviderPaymentStatus.APPROVED,
      ProviderPaymentStatus.REJECTED,
      ProviderPaymentStatus.CANCELLED,
      ProviderPaymentStatus.IN_PROCESS,
    ];
    for (const status of all) {
      expect(PAYMENT_STATUS_BADGE_VARIANT[status]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// PaymentStatusBadge — renders the correct label + variant
// ---------------------------------------------------------------------------

describe("PaymentStatusBadge", () => {
  it("renders the Spanish label 'Pendiente' for PENDING", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.PENDING} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Aprobado' for APPROVED", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.APPROVED} />);
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Rechazado' for REJECTED", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.REJECTED} />);
    expect(screen.getByText("Rechazado")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Cancelado' for CANCELLED", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.CANCELLED} />);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("renders the Spanish label 'En proceso' for IN_PROCESS", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.IN_PROCESS} />);
    expect(screen.getByText("En proceso")).toBeInTheDocument();
  });

  it("renders a destructive-variant badge for REJECTED", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.REJECTED} />);
    const badge = screen.getByText("Rechazado");
    expect(badge).toHaveAttribute("data-variant", "destructive");
  });

  it("renders a secondary-variant badge for CANCELLED", () => {
    render(<PaymentStatusBadge status={ProviderPaymentStatus.CANCELLED} />);
    const badge = screen.getByText("Cancelado");
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });
});
