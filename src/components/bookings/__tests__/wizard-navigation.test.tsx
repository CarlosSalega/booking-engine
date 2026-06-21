/**
 * Tests for `WizardNavigation` — the prev/next/cancel button bar
 * at the bottom of the wizard.
 *
 * The component is a thin client wrapper:
 * - Reads `currentStep`, `canAdvance`, `isSubmitting` from props.
 * - Calls `onPrev` / `onNext` / `onCancel` callbacks.
 * - Disables the "Siguiente" button when `canAdvance === false`.
 * - Hides the "Anterior" button on step 1.
 * - Renders a "Crear reserva" submit button on step 6.
 * - Renders a "Cancelar" button (always visible) that calls `onCancel`.
 *
 * State and side effects (advance, reset, submit) live in the page
 * — this component is a pure presentational adapter.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WizardNavigation } from "@/components/bookings/wizard/wizard-navigation";

describe("WizardNavigation", () => {
  it("renders Anterior + Siguiente on intermediate steps", () => {
    render(
      <WizardNavigation
        currentStep={2}
        canAdvance={true}
        isSubmitting={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
  });

  it("hides the Anterior button on step 1", () => {
    render(
      <WizardNavigation
        currentStep={1}
        canAdvance={true}
        isSubmitting={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /anterior/i })).not.toBeInTheDocument();
  });

  it("renders a Crear reserva button on step 6 (instead of Siguiente)", () => {
    render(
      <WizardNavigation
        currentStep={6}
        canAdvance={true}
        isSubmitting={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /crear reserva/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^siguiente$/i })).not.toBeInTheDocument();
  });

  it("disables Siguiente when canAdvance is false", () => {
    render(
      <WizardNavigation
        currentStep={2}
        canAdvance={false}
        isSubmitting={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("disables Anterior while submitting", () => {
    render(
      <WizardNavigation
        currentStep={3}
        canAdvance={true}
        isSubmitting={true}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
  });

  it("disables the submit button while submitting", () => {
    render(
      <WizardNavigation
        currentStep={6}
        canAdvance={true}
        isSubmitting={true}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // When submitting, the submit button label switches to "Creando reserva…".
    expect(
      screen.getByRole("button", { name: /creando reserva/i }),
    ).toBeDisabled();
  });

  it("calls onPrev when Anterior is clicked", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(
      <WizardNavigation
        currentStep={3}
        canAdvance={true}
        isSubmitting={false}
        onPrev={onPrev}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /anterior/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when Siguiente is clicked", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <WizardNavigation
        currentStep={2}
        canAdvance={true}
        isSubmitting={false}
        onPrev={vi.fn()}
        onNext={onNext}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <WizardNavigation
        currentStep={3}
        canAdvance={true}
        isSubmitting={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
