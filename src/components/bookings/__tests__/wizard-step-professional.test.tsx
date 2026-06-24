/**
 * Tests for `WizardStepProfessional` — step 2 of the booking wizard.
 *
 * Renders the ACTIVE professionals who offer the previously-selected
 * service. Fetches the list when the component mounts OR when the
 * `serviceId` prop changes. When `serviceId` is null, the component
 * returns null (the page should not be on step 2 without a service).
 *
 * Same render states as step 1: loading / error / empty / ready.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ProfessionalOption } from "@/modules/bookings/data/booking-data.types";

import { WizardStepProfessional } from "@/components/bookings/wizard/wizard-step-professional";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getProfessionalsMock = vi.fn();
vi.mock("@/modules/bookings/actions", () => ({
  getProfessionalsForWizard: (id: string) => getProfessionalsMock(id),
}));

beforeEach(() => {
  getProfessionalsMock.mockReset();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROS: ProfessionalOption[] = [
  {
    id: "prof-1",
    userId: "user-prof-1",
    user: { name: "Dr. García" },
    specialties: ["Odontología", "Endodoncia"],
  },
  {
    id: "prof-2",
    userId: "user-prof-2",
    user: { name: "Dra. López" },
    specialties: [],
  },
];

describe("WizardStepProfessional", () => {
  it("returns null when serviceId is null", () => {
    const { container } = render(
      <WizardStepProfessional
        serviceId={null}
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders loading state on mount while fetching", () => {
    getProfessionalsMock.mockReturnValue(new Promise(() => {}));
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/cargando profesionales/i)).toBeInTheDocument();
  });

  it("renders the professionals list once the data resolves", async () => {
    getProfessionalsMock.mockResolvedValue(PROS);
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(await screen.findByText("Dr. García")).toBeInTheDocument();
    expect(screen.getByText("Dra. López")).toBeInTheDocument();
  });

  it("shows an error state when the fetch fails", async () => {
    getProfessionalsMock.mockRejectedValue(new Error("Boom"));
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/no se pudieron cargar los profesionales/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when no professionals offer the service", async () => {
    getProfessionalsMock.mockResolvedValue([]);
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/no hay profesionales disponibles/i),
    ).toBeInTheDocument();
  });

  it("renders specialties when present", async () => {
    getProfessionalsMock.mockResolvedValue(PROS);
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    await screen.findByText("Dr. García");
    // The implementation joins the specialties with " · " so the
    // text appears in a single node; getAllByText returns each match
    // (the function matcher approach matches every parent node too).
    expect(screen.getAllByText(/Odontología/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Endodoncia/i).length).toBeGreaterThan(0);
  });

  it("marks the currently selected professional as pressed", async () => {
    getProfessionalsMock.mockResolvedValue(PROS);
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId="prof-1"
        onSelect={vi.fn()}
      />,
    );
    const selected = await screen.findByRole("button", { name: /dr\. garcía/i });
    expect(selected).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect with the full professional object when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    getProfessionalsMock.mockResolvedValue(PROS);
    render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={onSelect}
      />,
    );
    const card = await screen.findByRole("button", { name: /dra\. lópez/i });
    await user.click(card);
    // The component passes the whole `ProfessionalOption` (not just
    // the id) so the wizard store can cache the user/specialties for
    // the confirm step.
    expect(onSelect).toHaveBeenCalledWith(PROS[1]);
  });

  it("re-fetches when serviceId changes", async () => {
    getProfessionalsMock.mockResolvedValue(PROS);
    const { rerender } = render(
      <WizardStepProfessional
        serviceId="svc-1"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    await screen.findByText("Dr. García");
    rerender(
      <WizardStepProfessional
        serviceId="svc-2"
        selectedProfessionalId={null}
        onSelect={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(getProfessionalsMock).toHaveBeenCalledWith("svc-2");
    });
  });
});
