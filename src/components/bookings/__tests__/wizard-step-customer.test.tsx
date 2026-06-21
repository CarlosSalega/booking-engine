/**
 * Tests for `WizardStepCustomer` — step 4 of the booking wizard.
 *
 * Two modes:
 * - **Existing patient** — search input + selectable list of patients
 *   fetched via `getPatientsForWizard(search?)`.
 * - **Guest** — three inputs (name, phone, email) and no DB lookup.
 *
 * Toggling between modes is a `Tabs`-like radio group. The component
 * owns no state for the search term — it manages the search input
 * locally and re-fetches on each debounced change.
 *
 * The Server Action is mocked at the module boundary.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PatientOption } from "@/modules/bookings/data/booking-data.types";

import { WizardStepCustomer } from "@/components/bookings/wizard/wizard-step-customer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getPatientsMock = vi.fn();
vi.mock("@/modules/bookings/actions", () => ({
  getPatientsForWizard: (search: string | undefined) => getPatientsMock(search),
}));

beforeEach(() => {
  getPatientsMock.mockReset();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PATIENTS: PatientOption[] = [
  { id: "pat-1", user: { name: "Juan Pérez", email: "juan@example.com" } },
  { id: "pat-2", user: { name: "Ana López", email: "ana@example.com" } },
];

describe("WizardStepCustomer", () => {
  it("renders a mode toggle (existing / guest) by default on existing", () => {
    getPatientsMock.mockResolvedValue([]);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", { name: /paciente existente/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /invitado/i })).toBeInTheDocument();
  });

  it("calls onModeChange when the guest tab is clicked", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    getPatientsMock.mockResolvedValue([]);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={onModeChange}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("tab", { name: /invitado/i }));
    expect(onModeChange).toHaveBeenCalledWith("guest");
  });

  it("fetches patients on mount in existing mode", async () => {
    getPatientsMock.mockResolvedValue(PATIENTS);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(getPatientsMock).toHaveBeenCalled();
    });
  });

  it("renders the patients list once the data resolves", async () => {
    getPatientsMock.mockResolvedValue(PATIENTS);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    expect(await screen.findByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Ana López")).toBeInTheDocument();
  });

  it("shows an empty state when no patients match", async () => {
    getPatientsMock.mockResolvedValue([]);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/no se encontraron pacientes/i),
    ).toBeInTheDocument();
  });

  it("calls onSelectPatient when a patient is clicked", async () => {
    const user = userEvent.setup();
    const onSelectPatient = vi.fn();
    getPatientsMock.mockResolvedValue(PATIENTS);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={onSelectPatient}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    const card = await screen.findByRole("button", { name: /ana lópez/i });
    await user.click(card);
    expect(onSelectPatient).toHaveBeenCalledWith("pat-2");
  });

  it("marks the selected patient as pressed", async () => {
    getPatientsMock.mockResolvedValue(PATIENTS);
    render(
      <WizardStepCustomer
        mode="existing"
        onModeChange={vi.fn()}
        selectedPatientId="pat-1"
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    const selected = await screen.findByRole("button", { name: /juan pérez/i });
    expect(selected).toHaveAttribute("aria-pressed", "true");
  });

  it("renders guest form inputs in guest mode", () => {
    render(
      <WizardStepCustomer
        mode="guest"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName="Ana"
        guestPhone="351-1111"
        guestEmail="ana@x.com"
        onGuestChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Ana");
    expect(screen.getByLabelText(/tel[eé]fono/i)).toHaveValue("351-1111");
    expect(screen.getByLabelText(/email/i)).toHaveValue("ana@x.com");
  });

  it("calls onGuestChange when the name input changes", async () => {
    const user = userEvent.setup();
    const onGuestChange = vi.fn();
    render(
      <WizardStepCustomer
        mode="guest"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={onGuestChange}
      />,
    );
    await user.type(screen.getByLabelText(/nombre/i), "A");
    expect(onGuestChange).toHaveBeenCalled();
  });

  it("does not render the search input in guest mode", () => {
    render(
      <WizardStepCustomer
        mode="guest"
        onModeChange={vi.fn()}
        selectedPatientId={null}
        onSelectPatient={vi.fn()}
        guestName=""
        guestPhone=""
        guestEmail=""
        onGuestChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/buscar paciente/i)).not.toBeInTheDocument();
  });
});
