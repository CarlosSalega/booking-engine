/**
 * Tests for `WizardStepPayment` — step 5 of the booking wizard.
 *
 * The payment step is a placeholder. The spec says: "shows the
 * service price, payment type (NONE/FULL/DEPOSIT), placeholder for
 * payment". There is no payment integration in MVP; this step just
 * reads the service's `paymentType` from the parent and displays the
 * matching Argentinian-Spanish label.
 *
 * The component is purely presentational. The parent provides the
 * service info (name, price, paymentType) — it does NOT fetch the
 * service. The service was already selected in step 1.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WizardStepPayment } from "@/components/bookings/wizard/wizard-step-payment";

describe("WizardStepPayment", () => {
  it("renders the service name and price", () => {
    render(
      <WizardStepPayment
        serviceName="Limpieza Dental"
        servicePrice={42500}
        paymentType="FULL"
      />,
    );
    expect(screen.getByText("Limpieza Dental")).toBeInTheDocument();
    // es-AR ARS formatting
    expect(screen.getByText(/42\.500/)).toBeInTheDocument();
  });

  it("renders the 'Pago completo' label for paymentType=FULL", () => {
    render(
      <WizardStepPayment
        serviceName="Limpieza"
        servicePrice={1000}
        paymentType="FULL"
      />,
    );
    expect(screen.getByText(/pago completo/i)).toBeInTheDocument();
  });

  it("renders the 'Seña requerida' label for paymentType=DEPOSIT", () => {
    render(
      <WizardStepPayment
        serviceName="Consulta"
        servicePrice={1000}
        paymentType="DEPOSIT"
      />,
    );
    expect(screen.getByText(/se[ñn]a/i)).toBeInTheDocument();
  });

  it("renders the 'Pago en el local' label for paymentType=NONE", () => {
    render(
      <WizardStepPayment
        serviceName="Control"
        servicePrice={0}
        paymentType="NONE"
      />,
    );
    expect(screen.getByText(/pago en el local/i)).toBeInTheDocument();
  });

  it("renders a MercadoPago placeholder notice", () => {
    render(
      <WizardStepPayment
        serviceName="X"
        servicePrice={0}
        paymentType="FULL"
      />,
    );
    expect(
      screen.getByText(/próximamente|pago en el consultorio/i),
    ).toBeInTheDocument();
  });
});
