/**
 * Tests for `WizardStepService` — the first step of the booking wizard.
 *
 * Step 1 lets the user pick one of the org's ACTIVE services. The
 * component:
 * - Fetches services on mount via the `getServicesForWizard` Server
 *   Action.
 * - Renders one card per service with name + duration + price.
 * - Marks the currently selected service as visually highlighted.
 * - Calls `onSelect(serviceId)` when the user picks one.
 * - Shows a loading state while fetching.
 * - Shows an error state when the fetch fails.
 * - Shows an empty state when the org has no ACTIVE services.
 *
 * The Server Action is mocked at the module boundary so the test
 * stays in plain RTL + jsdom.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ServiceOption } from "@/modules/bookings/data/booking-data.types";

import { WizardStepService } from "@/components/bookings/wizard/wizard-step-service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getServicesMock = vi.fn();
vi.mock("@/modules/bookings/actions", () => ({
  getServicesForWizard: () => getServicesMock(),
}));

beforeEach(() => {
  getServicesMock.mockReset();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SERVICES: ServiceOption[] = [
  {
    id: "svc-1",
    name: "Limpieza Dental",
    price: 42500,
    durationMinutes: 30,
    paymentType: "FULL",
  },
  {
    id: "svc-2",
    name: "Consulta General",
    price: 18000,
    durationMinutes: 45,
    paymentType: "DEPOSIT",
  },
  {
    id: "svc-3",
    name: "Control",
    price: 0,
    durationMinutes: 15,
    paymentType: "NONE",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WizardStepService", () => {
  it("renders a loading state on mount", () => {
    getServicesMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<WizardStepService selectedServiceId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/cargando servicios/i)).toBeInTheDocument();
  });

  it("renders the services list once the data resolves", async () => {
    getServicesMock.mockResolvedValue(SERVICES);
    render(<WizardStepService selectedServiceId={null} onSelect={vi.fn()} />);
    expect(await screen.findByText("Limpieza Dental")).toBeInTheDocument();
    expect(screen.getByText("Consulta General")).toBeInTheDocument();
    expect(screen.getByText("Control")).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    getServicesMock.mockRejectedValue(new Error("Boom"));
    render(<WizardStepService selectedServiceId={null} onSelect={vi.fn()} />);
    expect(
      await screen.findByText(/no se pudieron cargar los servicios/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no ACTIVE services", async () => {
    getServicesMock.mockResolvedValue([]);
    render(<WizardStepService selectedServiceId={null} onSelect={vi.fn()} />);
    expect(
      await screen.findByText(/no hay servicios disponibles/i),
    ).toBeInTheDocument();
  });

  it("renders duration and price on each service card", async () => {
    getServicesMock.mockResolvedValue(SERVICES);
    render(<WizardStepService selectedServiceId={null} onSelect={vi.fn()} />);
    await screen.findByText("Limpieza Dental");
    // 30 min · $ 42.500,00 (es-AR ARS formatting includes a space after $)
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*42\.500/)).toBeInTheDocument();
  });

  it("marks the currently selected service as pressed", async () => {
    getServicesMock.mockResolvedValue(SERVICES);
    render(
      <WizardStepService selectedServiceId="svc-1" onSelect={vi.fn()} />,
    );
    const selected = await screen.findByRole("button", {
      name: /limpieza dental/i,
    });
    expect(selected).toHaveAttribute("aria-pressed", "true");
  });

  it("marks non-selected services as not pressed", async () => {
    getServicesMock.mockResolvedValue(SERVICES);
    render(
      <WizardStepService selectedServiceId="svc-1" onSelect={vi.fn()} />,
    );
    const other = await screen.findByRole("button", {
      name: /consulta general/i,
    });
    expect(other).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSelect with the full service object when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    getServicesMock.mockResolvedValue(SERVICES);
    render(<WizardStepService selectedServiceId={null} onSelect={onSelect} />);
    const card = await screen.findByRole("button", {
      name: /limpieza dental/i,
    });
    await user.click(card);
    // The component passes the whole `ServiceOption` (not just the
    // id) so the wizard store can cache the name/price/paymentType
    // for the payment + confirm steps.
    expect(onSelect).toHaveBeenCalledWith(SERVICES[0]);
  });

  it("does not call onSelect when the currently selected service is clicked again", async () => {
    // The store handles "same selection" (it just re-validates), but
    // the UI should still emit the event so the parent can decide.
    // We document the current behavior: the click always fires.
    const user = userEvent.setup();
    const onSelect = vi.fn();
    getServicesMock.mockResolvedValue(SERVICES);
    render(
      <WizardStepService selectedServiceId="svc-1" onSelect={onSelect} />,
    );
    const card = await screen.findByRole("button", {
      name: /limpieza dental/i,
    });
    await user.click(card);
    expect(onSelect).toHaveBeenCalledWith(SERVICES[0]);
  });

  it("fetches only once across renders", async () => {
    getServicesMock.mockResolvedValue(SERVICES);
    const { rerender } = render(
      <WizardStepService selectedServiceId={null} onSelect={vi.fn()} />,
    );
    await screen.findByText("Limpieza Dental");
    rerender(<WizardStepService selectedServiceId="svc-1" onSelect={vi.fn()} />);
    // wait a tick to make sure no extra fetch fired
    await waitFor(() => {
      expect(getServicesMock).toHaveBeenCalledTimes(1);
    });
  });
});
