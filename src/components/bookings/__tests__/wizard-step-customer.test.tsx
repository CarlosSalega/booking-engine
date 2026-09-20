/**
 * Tests for `WizardStepCustomer` — step 4 of the booking wizard.
 *
 * Two modes:
 * - **Existing patient** — search input + selectable list of patients
 *   fetched via `getPatientsForWizard(search?)`.
 * - **Guest** — three inputs (name, phone, email) and no DB lookup.
 *
 * Toggling between modes is a native radio group (no ToggleGroup dep,
 * per the ux-audit-fixes design decision — ToggleGroup is not
 * installed in this repo). The component owns no state for the search
 * term — it manages the search input locally and re-fetches on each
 * debounced change.
 *
 * Loading state uses `Skeleton` rows (per ui-feedback spec — content
 * loading is Skeleton, not spinners). Spinners are reserved for
 * button-level submit actions.
 *
 * The Server Action is mocked at the module boundary.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  it("renders a mode toggle (existing / guest) as a native radiogroup", () => {
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
      screen.getByRole("radio", { name: /paciente existente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /invitado/i }),
    ).toBeInTheDocument();
  });

  it("calls onModeChange when the guest radio is selected", async () => {
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
    await user.click(screen.getByRole("radio", { name: /invitado/i }));
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

  it("calls onSelectPatient with the full patient object when a card is clicked", async () => {
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
    // The component passes the whole `PatientOption` (not just the
    // id) so the wizard store can cache the user.name + user.email
    // for the confirm step.
    expect(onSelectPatient).toHaveBeenCalledWith(PATIENTS[1]);
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

// ---------------------------------------------------------------------------
// Radiogroup semantics — bookings spec §"Step 4 customer-mode switch"
// ---------------------------------------------------------------------------

describe("WizardStepCustomer — customer-mode radiogroup (bookings spec)", () => {
  it("renders the switch as a radiogroup with a Spanish accessible name", () => {
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
      screen.getByRole("radiogroup", { name: /modo de paciente/i }),
    ).toBeInTheDocument();
  });

  it("exposes exactly two radio options inside the radiogroup", () => {
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
    const group = screen.getByRole("radiogroup", {
      name: /modo de paciente/i,
    });
    expect(
      within(group).getAllByRole("radio", {
        name: /paciente existente/i,
      }),
    ).toHaveLength(1);
    expect(
      within(group).getAllByRole("radio", {
        name: /invitado/i,
      }),
    ).toHaveLength(1);
  });

  it("marks the selected option as checked and the other as not checked", () => {
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
      screen.getByRole("radio", { name: /paciente existente/i }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: /invitado/i })).not.toBeChecked();
  });

  it("reverses the checked state when the parent flips mode to guest", () => {
    getPatientsMock.mockResolvedValue([]);
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
    expect(
      screen.getByRole("radio", { name: /paciente existente/i }),
    ).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /invitado/i })).toBeChecked();
  });

  it("does NOT render the previous tablist/tab roles on the switch", () => {
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
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("moves focus and updates selection with ArrowRight (native radio behavior)", async () => {
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
    const existing = screen.getByRole("radio", {
      name: /paciente existente/i,
    });
    existing.focus();
    expect(existing).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    // Native radios with the same `name` form an implicit radiogroup:
    // ArrowRight moves focus to the next radio AND selects it. The
    // parent is notified via `onChange` on the underlying input.
    expect(onModeChange).toHaveBeenCalledWith("guest");
  });
});

// ---------------------------------------------------------------------------
// Patient-search loading state — bookings + ui-feedback spec
// (Skeleton rows, not spinners; `role="status"` + Spanish aria-label)
// ---------------------------------------------------------------------------

describe("WizardStepCustomer — patient-search loading skeleton", () => {
  it("renders three Skeleton rows while the patient fetch is pending", () => {
    getPatientsMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(
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
    const status = screen.getByRole("status", { name: /buscando pacientes/i });
    expect(status).toBeInTheDocument();
    // The loading region contains exactly 3 Skeleton rows dimension-matched
    // to the patient-row buttons (`p-3` row, 68px tall, full width, rounded).
    // Skeleton renders a <div data-slot="skeleton"> — the stable selector
    // is the `data-slot` attribute (matches the `ui/skeleton.tsx` contract).
    const skeletons = Array.from(
      container.querySelectorAll('[data-slot="skeleton"]'),
    );
    expect(skeletons).toHaveLength(3);
    // Class assertion stays implementation-coupled by design — the
    // 68px dimension is a contract to the patient row height so the
    // layout does not jump on resolve.
    expect(skeletons[0]).toHaveClass("h-[68px]");
    expect(skeletons[0]).toHaveClass("w-full");
    expect(skeletons[0]).toHaveClass("rounded-lg");
  });

  it("does NOT render a Loader2 spinner in the loading state", () => {
    getPatientsMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(
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
    // Loader2 from lucide-react renders an <svg … animate-spin />. The
    // stable contract is the spinning-class substring; we grep the
    // container for `animate-spin` and assert zero matches.
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
