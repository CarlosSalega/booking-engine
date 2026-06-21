/**
 * Tests for `WizardStepSchedule` — step 3 of the booking wizard.
 *
 * Renders a date input + a grid of available 30-min time slots for
 * the selected (professional, service, date) combination. The user
 * picks one slot, which feeds into step 4.
 *
 * Fetches `getAvailableSlotsForWizard(profId, svcId, date)` whenever
 * any of the three inputs change.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AvailableSlot } from "@/modules/bookings/data/booking-availability";

import { WizardStepSchedule } from "@/components/bookings/wizard/wizard-step-schedule";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getSlotsMock = vi.fn();
vi.mock("@/modules/bookings/actions", () => ({
  getAvailableSlotsForWizard: (
    profId: string,
    svcId: string,
    date: Date,
  ) => getSlotsMock(profId, svcId, date),
}));

beforeEach(() => {
  getSlotsMock.mockReset();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Local-time HH:MM used in button labels (the runtime uses the OS TZ). */
function formatHHMM(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// Slot times are TZ-sensitive: the formatter uses local time. We pick
// a date far in the future and use local time directly so the test
// is stable across CI environments.
const SLOT1_START = new Date(2026, 5, 20, 9, 0, 0); // 2026-06-20 09:00 local
const SLOT1_END = new Date(2026, 5, 20, 9, 30, 0);
const SLOT2_START = new Date(2026, 5, 20, 9, 30, 0);
const SLOT2_END = new Date(2026, 5, 20, 10, 0, 0);
const SLOT3_START = new Date(2026, 5, 20, 10, 0, 0);
const SLOT3_END = new Date(2026, 5, 20, 10, 30, 0);

const SLOT1_LABEL = formatHHMM(SLOT1_START);
const SLOT2_LABEL = formatHHMM(SLOT2_START);
const SLOT3_LABEL = formatHHMM(SLOT3_START);

const SLOTS: AvailableSlot[] = [
  { startTime: SLOT1_START, endTime: SLOT1_END },
  { startTime: SLOT2_START, endTime: SLOT2_END },
  { startTime: SLOT3_START, endTime: SLOT3_END },
];

describe("WizardStepSchedule", () => {
  it("returns null when professionalId is null", () => {
    const { container } = render(
      <WizardStepSchedule
        professionalId={null}
        serviceId="svc-1"
        selectedDate={null}
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when serviceId is null", () => {
    const { container } = render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId={null}
        selectedDate={null}
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the date input + a placeholder before any date is chosen", () => {
    render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId="svc-1"
        selectedDate={null}
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(
      screen.getByText(/elegí una fecha para ver los horarios/i),
    ).toBeInTheDocument();
  });

  it("fetches slots when a date is selected", async () => {
    getSlotsMock.mockResolvedValue(SLOTS);
    const user = userEvent.setup();
    // Render a wrapper that owns the date so the onDateChange callback
    // can re-render with the new prop, mirroring how the page uses
    // the store.
    function Harness() {
      const [date, setDate] = useState<string | null>(null);
      return (
        <WizardStepSchedule
          professionalId="prof-1"
          serviceId="svc-1"
          selectedDate={date}
          selectedStartTime={null}
          selectedEndTime={null}
          onSelect={vi.fn()}
          onDateChange={setDate}
        />
      );
    }
    render(<Harness />);
    const dateInput = screen.getByLabelText(/fecha/i);
    await user.type(dateInput, "2026-06-20");
    await waitFor(() => {
      expect(getSlotsMock).toHaveBeenCalled();
    });
  });

  it("renders the available slots once the fetch resolves", async () => {
    getSlotsMock.mockResolvedValue(SLOTS);
    const onSelect = vi.fn();
    render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId="svc-1"
        selectedDate="2026-06-20"
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={onSelect}
      />,
    );
    // The label is "HH:MM – HH:MM" so use anchored regex to avoid
    // matching the end-time of an earlier slot.
    expect(
      await screen.findByRole("button", {
        name: new RegExp(`^${SLOT1_LABEL} – `),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: new RegExp(`^${SLOT2_LABEL} – `),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: new RegExp(`^${SLOT3_LABEL} – `),
      }),
    ).toBeInTheDocument();
  });

  it("shows an error state when the slot fetch fails", async () => {
    getSlotsMock.mockRejectedValue(new Error("Boom"));
    render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId="svc-1"
        selectedDate="2026-06-20"
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/no se pudieron cargar los horarios/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no available slots", async () => {
    getSlotsMock.mockResolvedValue([]);
    render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId="svc-1"
        selectedDate="2026-06-20"
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/no hay horarios disponibles/i),
    ).toBeInTheDocument();
  });

  it("calls onSelect with the start + end time when a slot is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    getSlotsMock.mockResolvedValue(SLOTS);
    render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId="svc-1"
        selectedDate="2026-06-20"
        selectedStartTime={null}
        selectedEndTime={null}
        onSelect={onSelect}
      />,
    );
    const slot = await screen.findByRole("button", {
      name: new RegExp(`^${SLOT1_LABEL} – `),
    });
    await user.click(slot);
    expect(onSelect).toHaveBeenCalledWith(
      "2026-06-20",
      SLOT1_LABEL,
      formatHHMM(SLOT1_END),
    );
  });

  it("marks the currently selected slot as pressed", async () => {
    getSlotsMock.mockResolvedValue(SLOTS);
    render(
      <WizardStepSchedule
        professionalId="prof-1"
        serviceId="svc-1"
        selectedDate="2026-06-20"
        selectedStartTime={SLOT2_LABEL}
        selectedEndTime={formatHHMM(SLOT2_END)}
        onSelect={vi.fn()}
      />,
    );
    const selected = await screen.findByRole("button", {
      name: new RegExp(`^${SLOT2_LABEL} – `),
    });
    expect(selected).toHaveAttribute("aria-pressed", "true");
  });
});
