/**
 * Tests for the `NewBookingPage` Client Component — the wizard
 * orchestrator at `/dashboard/bookings/new`.
 *
 * The page is a thin Client Component that:
 * - Resets the wizard store on mount (so revisiting the page starts
 *   clean).
 * - Reads `currentStep` from the store and renders the right step.
 * - Wraps everything in the `<WizardNavigation>` bar.
 * - On step 6, calls `createBooking` and redirects to the detail
 *   page on success.
 * - On cancel, navigates back to the list page.
 *
 * The step components are mocked at the module boundary so the test
 * stays focused on the orchestration logic. The individual step
 * components have their own test files.
 *
 * Server Actions and `next/navigation` are also mocked so the test
 * runs in pure RTL + jsdom.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BookingResult } from "@/modules/bookings/actions";
import { useWizardStore } from "@/modules/bookings/presentation/wizard-store";
import type {
  PatientOption,
  ProfessionalOption,
  ServiceOption,
} from "@/modules/bookings/data/booking-data.types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the step components — they have their own test files. The
// mocks expose a `data-testid` so the test can assert which step the
// page rendered.
vi.mock("@/components/bookings/wizard/wizard-step-service", () => ({
  WizardStepService: () => <div data-testid="wizard-step-service" />,
}));
vi.mock("@/components/bookings/wizard/wizard-step-professional", () => ({
  WizardStepProfessional: () => <div data-testid="wizard-step-professional" />,
}));
vi.mock("@/components/bookings/wizard/wizard-step-schedule", () => ({
  WizardStepSchedule: () => <div data-testid="wizard-step-schedule" />,
}));
vi.mock("@/components/bookings/wizard/wizard-step-customer", () => ({
  WizardStepCustomer: () => <div data-testid="wizard-step-customer" />,
}));
vi.mock("@/components/bookings/wizard/wizard-step-payment", () => ({
  WizardStepPayment: () => <div data-testid="wizard-step-payment" />,
}));
vi.mock("@/components/bookings/wizard/wizard-step-confirm", () => ({
  WizardStepConfirm: ({
    onSubmit,
    error,
  }: {
    onSubmit: () => void;
    error: string | null;
  }) => (
    <div data-testid="wizard-step-confirm">
      {error ? (
        <div role="alert">
          <p>{error}</p>
        </div>
      ) : null}
      <button type="button" onClick={onSubmit}>
        Confirmar y crear reserva
      </button>
    </div>
  ),
}));

const createBookingMock = vi.fn();
vi.mock("@/modules/bookings/actions", () => ({
  createBooking: (input: unknown) => createBookingMock(input),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

// Import after the mocks are in place.
const { default: NewBookingPage } = await import(
  "@/app/(dashboard)/dashboard/bookings/new/page"
);

// ---------------------------------------------------------------------------
// Fixtures — full objects, matching the real `ServiceOption` /
// `ProfessionalOption` / `PatientOption` shapes. The wizard store
// setters now take objects, not ids, so all the helpers below pass
// these directly.
// ---------------------------------------------------------------------------

const SERVICE: ServiceOption = {
  id: "svc-1",
  name: "Consulta General",
  price: 5000,
  durationMinutes: 30,
  paymentType: "FULL",
};

const PROFESSIONAL: ProfessionalOption = {
  id: "prof-1",
  userId: "user-prof-1",
  user: { name: "Dra. Pérez" },
  specialties: ["Kinesiología"],
};

const PATIENT: PatientOption = {
  id: "pat-1",
  user: { name: "Ana López", email: "ana@x.com" },
};

beforeEach(() => {
  // Reset the wizard store + mocks between tests.
  useWizardStore.getState().reset();
  createBookingMock.mockReset();
  pushMock.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pre-fills the store AFTER the page has mounted (so the mount-time
 * reset doesn't undo the values). The page resets the store on
 * mount; setting state before render is futile. Call this inside
 * `act()` after the initial render.
 */
function fillStoreForStep6() {
  const s = useWizardStore.getState();
  s.setService(SERVICE);
  s.setProfessional(PROFESSIONAL);
  s.setSchedule("2026-06-20", "09:00", "09:30");
  s.setPatient(PATIENT);
  s.goToStep(6);
}

function fillStoreForStep4() {
  const s = useWizardStore.getState();
  s.setService(SERVICE);
  s.setProfessional(PROFESSIONAL);
  s.setSchedule("2026-06-20", "09:00", "09:30");
  s.goToStep(4);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NewBookingPage", () => {
  it("renders the wizard progress bar on mount", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    expect(screen.getByLabelText(/pasos del wizard/i)).toBeInTheDocument();
  });

  it("renders the service step on mount (currentStep starts at 1)", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    expect(screen.getByTestId("wizard-step-service")).toBeInTheDocument();
  });

  it("renders the professional step when currentStep is 2", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    // The page resets the store on mount, so we set state after
    // mount (via goToStep) to simulate the user advancing.
    act(() => {
      useWizardStore.getState().goToStep(2);
    });
    expect(screen.getByTestId("wizard-step-professional")).toBeInTheDocument();
  });

  it("renders the schedule step when currentStep is 3", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      useWizardStore.getState().goToStep(3);
    });
    expect(screen.getByTestId("wizard-step-schedule")).toBeInTheDocument();
  });

  it("renders the customer step when currentStep is 4", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      useWizardStore.getState().goToStep(4);
    });
    expect(screen.getByTestId("wizard-step-customer")).toBeInTheDocument();
  });

  it("renders the payment step when currentStep is 5", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      // Need a service (id + object) for the payment step to render.
      useWizardStore.getState().setService(SERVICE);
      useWizardStore.getState().goToStep(5);
    });
    expect(screen.getByTestId("wizard-step-payment")).toBeInTheDocument();
  });

  it("renders the confirm step when currentStep is 6", async () => {
    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      fillStoreForStep6();
    });
    expect(screen.getByTestId("wizard-step-confirm")).toBeInTheDocument();
  });

  it("resets the wizard store on mount", async () => {
    // Stale state from a previous visit — set BEFORE mount so the
    // reset on mount has something to undo.
    useWizardStore.setState({
      serviceId: "old",
      professionalId: "old",
      currentStep: 3,
    });

    await act(async () => {
      render(<NewBookingPage />);
    });

    // After mount, the store should be back to the initial state.
    const s = useWizardStore.getState();
    expect(s.serviceId).toBeNull();
    expect(s.professionalId).toBeNull();
    expect(s.currentStep).toBe(1);
  });

  it("advances to the next step when Siguiente is clicked and the step is valid", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      // Select a service so step 1 is valid.
      useWizardStore.getState().setService(SERVICE);
    });
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it("does NOT advance when the current step is invalid", async () => {
    const user = userEvent.setup();
    // Step 1, no service selected → canAdvance === false.
    await act(async () => {
      render(<NewBookingPage />);
    });
    const nextBtn = screen.getByRole("button", { name: /siguiente/i });
    expect(nextBtn).toBeDisabled();
    await user.click(nextBtn).catch(() => {
      // user-event on a disabled button rejects — expected.
    });
    expect(useWizardStore.getState().currentStep).toBe(1);
  });

  it("navigates back when Anterior is clicked", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      // Go to step 3 to test Anterior from there.
      useWizardStore.getState().setService(SERVICE);
      useWizardStore.getState().setProfessional(PROFESSIONAL);
      useWizardStore.getState().setSchedule("2026-06-20", "09:00", "09:30");
      useWizardStore.getState().goToStep(3);
    });
    await user.click(screen.getByRole("button", { name: /anterior/i }));
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it("navigates back to /dashboard/bookings when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<NewBookingPage />);
    });
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/bookings");
  });

  it("calls createBooking and redirects on success (step 6 submit)", async () => {
    const user = userEvent.setup();
    createBookingMock.mockResolvedValue({
      success: true,
      data: {
        id: "new-booking-id",
        status: "PENDING",
        startTime: new Date(),
        endTime: new Date(),
      },
    } satisfies BookingResult<{
      id: string;
      status: string;
      startTime: Date;
      endTime: Date;
    }>);

    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      fillStoreForStep6();
    });

    await user.click(
      screen.getByRole("button", { name: /confirmar y crear/i }),
    );

    await waitFor(() => {
      expect(createBookingMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/dashboard/bookings/new-booking-id",
      );
    });
  });

  it("shows the error message from createBooking on failure (step 6)", async () => {
    const user = userEvent.setup();
    createBookingMock.mockResolvedValue({
      success: false,
      error: "El horario está ocupado",
    } satisfies BookingResult);

    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      fillStoreForStep6();
    });

    await user.click(
      screen.getByRole("button", { name: /confirmar y crear/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/el horario está ocupado/i),
      ).toBeInTheDocument();
    });
  });

  it("forwards the wizard store data to createBooking on submit", async () => {
    const user = userEvent.setup();
    createBookingMock.mockResolvedValue({
      success: true,
      data: {
        id: "x",
        status: "PENDING",
        startTime: new Date(),
        endTime: new Date(),
      },
    } satisfies BookingResult<{
      id: string;
      status: string;
      startTime: Date;
      endTime: Date;
    }>);

    await act(async () => {
      render(<NewBookingPage />);
    });
    act(() => {
      fillStoreForStep4();
      useWizardStore.getState().setGuest("Ana", "351-1111", "ana@x.com");
      useWizardStore.getState().setNotes("paciente con muletas");
      useWizardStore.getState().goToStep(6);
    });

    await user.click(
      screen.getByRole("button", { name: /confirmar y crear/i }),
    );

    await waitFor(() => {
      const call = createBookingMock.mock.calls[0]?.[0] as {
        serviceId: string;
        professionalId: string;
        startTime: Date;
        patientId?: string;
        guestName?: string;
        guestPhone?: string;
        guestEmail?: string;
        notes?: string;
      };
      expect(call).toBeDefined();
      expect(call.serviceId).toBe("svc-1");
      expect(call.professionalId).toBe("prof-1");
      expect(call.startTime).toBeInstanceOf(Date);
      // Guest mode — patientId is null, guest fields populated.
      expect(call.patientId).toBeUndefined();
      expect(call.guestName).toBe("Ana");
      expect(call.guestPhone).toBe("351-1111");
      expect(call.guestEmail).toBe("ana@x.com");
      expect(call.notes).toBe("paciente con muletas");
    });
  });
});
