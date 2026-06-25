/**
 * Tests for the `PaymentEmptyState` Component.
 *
 * Mirrors the `PatientEmptyState` and `ProfessionalEmptyState` test
 * strategies: render the component and assert that the friendly
 * Spanish message + the testid are present. The component is
 * pure-markup (no state, no callbacks) so a single render-and-assert
 * test is enough.
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — Empty state when zero results: "No hay
 *   pagos" message displayed via PaymentEmptyState.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PaymentEmptyState } from "@/components/payments/payment-empty-state";

describe("PaymentEmptyState", () => {
  it("renders the testid so tests and screen-readers can find it", () => {
    render(<PaymentEmptyState />);
    expect(screen.getByTestId("payment-empty-state")).toBeInTheDocument();
  });

  it("renders the 'No hay pagos' message in Argentinian Spanish", () => {
    render(<PaymentEmptyState />);
    expect(screen.getByText("No hay pagos")).toBeInTheDocument();
  });

  it("renders a helpful secondary line explaining when payments will appear", () => {
    render(<PaymentEmptyState />);
    expect(
      screen.getByText(/cuando se registren pagos, aparecerán acá/i),
    ).toBeInTheDocument();
  });
});
