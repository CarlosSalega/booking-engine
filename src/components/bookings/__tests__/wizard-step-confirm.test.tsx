/**
 * Tests for `WizardStepConfirm` — step 6 of the booking wizard.
 *
 * Renders a read-only summary of all the selections (service,
 * professional, schedule, customer) and a "Confirmar reserva" button
 * that calls `onSubmit`. The submit itself is owned by the page; the
 * component is purely presentational.
 *
 * The summary is rendered in Argentinian Spanish.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  PatientOption,
  ProfessionalOption,
  ServiceOption,
} from "@/modules/bookings/data/booking-data.types";

import { WizardStepConfirm } from "@/components/bookings/wizard/wizard-step-confirm";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SERVICE: ServiceOption = {
  id: "svc-1",
  name: "Limpieza Dental",
  price: 42500,
  durationMinutes: 30,
  paymentType: "FULL",
};

const PROFESSIONAL: ProfessionalOption = {
  id: "prof-1",
  userId: "user-prof-1",
  user: { name: "Dr. García" },
  specialties: [],
};

const PATIENT: PatientOption = {
  id: "pat-1",
  user: { name: "Juan Pérez", email: "juan@example.com" },
};

describe("WizardStepConfirm", () => {
  it("renders a heading and the 4 summary cards (service, professional, schedule, customer)", () => {
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={false}
        patient={PATIENT}
        guestName=""
        guestPhone=""
        guestEmail=""
        isSubmitting={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Limpieza Dental")).toBeInTheDocument();
    expect(screen.getByText("Dr. García")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    // The date is formatted; the schedule card shows it.
    expect(screen.getByText(/09:00.*09:30/)).toBeInTheDocument();
  });

  it("renders the guest info when isGuest is true", () => {
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={true}
        patient={null}
        guestName="Ana López"
        guestPhone="351-1111"
        guestEmail="ana@x.com"
        isSubmitting={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );
    // The guest label is "Invitado: Ana López" — use a regex to
    // tolerate the prefix without depending on text node boundaries.
    expect(screen.getAllByText(/Ana López/i).length).toBeGreaterThan(0);
    // The phone + email are concatenated with " · " in the same
    // <p>, so the text is split across multiple JSX text nodes.
    // The container's textContent still has the values.
    expect(
      screen.getAllByText((_, node) =>
        node?.textContent?.includes("351-1111") ?? false,
      )[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) =>
        node?.textContent?.includes("ana@x.com") ?? false,
      )[0],
    ).toBeInTheDocument();
  });

  it("renders a Confirmar button (not 'Crear reserva' — that's the navigation bar)", () => {
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={false}
        patient={PATIENT}
        guestName=""
        guestPhone=""
        guestEmail=""
        isSubmitting={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );
    // The step is informational — it shows a final confirm button.
    expect(
      screen.getByRole("button", { name: /confirmar y crear/i }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit when the Confirmar button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={false}
        patient={PATIENT}
        guestName=""
        guestPhone=""
        guestEmail=""
        isSubmitting={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("button", { name: /confirmar y crear/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables the button while submitting", () => {
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={false}
        patient={PATIENT}
        guestName=""
        guestPhone=""
        guestEmail=""
        isSubmitting={true}
        error={null}
        onSubmit={vi.fn()}
      />,
    );
    // While submitting, the button label switches to "Creando reserva…".
    expect(
      screen.getByRole("button", { name: /creando reserva/i }),
    ).toBeDisabled();
  });

  it("renders an inline error message when error is set", () => {
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={false}
        patient={PATIENT}
        guestName=""
        guestPhone=""
        guestEmail=""
        isSubmitting={false}
        error="El horario está ocupado"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /el horario está ocupado/i,
    );
  });

  it("does not render the error alert when error is null", () => {
    render(
      <WizardStepConfirm
        service={SERVICE}
        professional={PROFESSIONAL}
        date="2026-06-20"
        startTime="09:00"
        endTime="09:30"
        isGuest={false}
        patient={PATIENT}
        guestName=""
        guestPhone=""
        guestEmail=""
        isSubmitting={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
