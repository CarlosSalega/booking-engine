/**
 * Tests for `WizardProgress` — the 6-step indicator at the top of the
 * wizard.
 *
 * Visual contract:
 * - 6 numbered steps rendered in a row (or column on small screens).
 * - The current step is highlighted.
 * - Completed steps (steps before the current one) are also highlighted
 *   differently from upcoming steps.
 * - The component is a pure function of `currentStep` + `totalSteps` —
 *   no store access, no side effects.
 *
 * Tests use `getByRole` + `aria-current` to verify behavior in a way
 * that survives CSS refactors.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WizardProgress } from "@/components/bookings/wizard/wizard-progress";

describe("WizardProgress", () => {
  it("renders 6 step labels", () => {
    render(<WizardProgress currentStep={1} />);
    expect(screen.getByText("Servicio")).toBeInTheDocument();
    expect(screen.getByText("Profesional")).toBeInTheDocument();
    expect(screen.getByText("Horario")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
  });

  it("marks the current step with aria-current='step'", () => {
    render(<WizardProgress currentStep={3} />);
    const current = screen.getByText("Horario").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("only one step is marked current at a time", () => {
    render(<WizardProgress currentStep={2} />);
    const currents = screen.getAllByRole("listitem", { hidden: true });
    // The list items have step data attrs; aria-current="step" appears
    // exactly once.
    const currentCount = currents.filter(
      (el) => el.getAttribute("aria-current") === "step",
    ).length;
    expect(currentCount).toBe(1);
  });

  it("renders 6 list items in order", () => {
    const { container } = render(<WizardProgress currentStep={1} />);
    const items = container.querySelectorAll('[data-wizard-step]');
    expect(items).toHaveLength(6);
    expect(items[0]?.getAttribute("data-wizard-step")).toBe("1");
    expect(items[5]?.getAttribute("data-wizard-step")).toBe("6");
  });

  it("caps currentStep at 6 (defensive)", () => {
    render(<WizardProgress currentStep={99} />);
    const current = screen.getByText("Confirmar").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("floors currentStep at 1 (defensive)", () => {
    render(<WizardProgress currentStep={0} />);
    const current = screen.getByText("Servicio").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
  });
});
