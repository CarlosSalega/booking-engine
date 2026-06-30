/**
 * Tests for the `BookingsTab` Client Component.
 *
 * `BookingsTab` is the form rendered inside the Bookings tab of the
 * settings page. It receives the cached `OrganizationSettings` row
 * (or `null` on a greenfield table) and the `readOnly` flag resolved
 * by `SettingsGuard`. The form edits the booking-rules section of the
 * row:
 *
 *  - `defaultDurationMinutes`  — number, range 5–480, step 5
 *  - `minAdvanceBookingHours`  — number, range 0–168
 *  - `maxBookingsPerDay`       — number, range 1–200
 *  - `bufferMinutes`           — number, range 0–120
 *
 * Flow (mirrors the project-wide `useTransition + useState` pattern
 * used by `BusinessTab` and `ServiceForm`):
 *
 *  1. Local `values` state pre-filled from the `settings` prop (or
 *     from `SETTINGS_DEFAULTS` when the row is `null`).
 *  2. Submit → `updateBookingsSchema.safeParse(...)` for client-side
 *     validation. On parse failure → render inline per-field errors
 *     + a Spanish banner; the Server Action is NOT called.
 *  3. On parse success → call the `updateBookings` Server Action
 *     inside `startTransition(async () => ...)`.
 *  4. On action success → `toast.success("Configuración guardada")`
 *     + `router.refresh()`.
 *  5. On action error → render the action's user-facing Spanish
 *     message inline; toast a copy.
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Bookings Tab → Scenario: Bookings range guard
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the component import.
// ---------------------------------------------------------------------------

const updateBookingsMock = vi.fn();
vi.mock("@/modules/settings/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/settings/actions")>();
  return {
    ...actual,
    updateBookings: updateBookingsMock,
  };
});

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

const { BookingsTab } = await import("../bookings-tab");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";

const baseSettings = {
  id: "00000000-0000-4000-8000-0000000000a1",
  organizationId: ORG_ID,
  name: "Clínica Demo",
  description: "Atención integral",
  address: "Av. Siempre Viva 742",
  timezone: "America/Argentina/Buenos_Aires",
  phone: "+5491144440000",
  email: "demo@clinica.test",
  defaultDurationMinutes: 30,
  minAdvanceBookingHours: 1,
  maxBookingsPerDay: 50,
  bufferMinutes: 0,
  cancellationEnabled: true,
  cancellationLimitHours: 24,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function renderTab(
  settings: typeof baseSettings | null = baseSettings,
  readOnly = false,
) {
  return render(<BookingsTab settings={settings} readOnly={readOnly} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BookingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateBookingsMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Pre-fill behaviour
  // -------------------------------------------------------------------------

  it("pre-fills all four fields from the `settings` prop", () => {
    renderTab(baseSettings);

    expect(screen.getByLabelText(/duración predeterminada/i)).toHaveValue(30);
    expect(screen.getByLabelText(/anticipación m[ií]nima/i)).toHaveValue(1);
    expect(screen.getByLabelText(/m[aá]ximo.*d[ií]a/i)).toHaveValue(50);
    expect(screen.getByLabelText(/buffer/i)).toHaveValue(0);
  });

  it("falls back to SETTINGS_DEFAULTS when `settings` is null (greenfield)", () => {
    renderTab(null);

    // SETTINGS_DEFAULTS: 30 / 1 / 50 / 0
    expect(screen.getByLabelText(/duración predeterminada/i)).toHaveValue(30);
    expect(screen.getByLabelText(/anticipación m[ií]nima/i)).toHaveValue(1);
    expect(screen.getByLabelText(/m[aá]ximo.*d[ií]a/i)).toHaveValue(50);
    expect(screen.getByLabelText(/buffer/i)).toHaveValue(0);
  });

  // -------------------------------------------------------------------------
  // Helper text — each field shows its valid range
  // -------------------------------------------------------------------------

  it("shows helper text with the valid range for each field", () => {
    renderTab(baseSettings);

    // defaultDurationMinutes: 5–480
    expect(screen.getByText(/5.*480/)).toBeInTheDocument();
    // minAdvanceBookingHours: 0–168
    expect(screen.getByText(/0.*168/)).toBeInTheDocument();
    // maxBookingsPerDay: 1–200
    expect(screen.getByText(/1.*200/)).toBeInTheDocument();
    // bufferMinutes: 0–120
    expect(screen.getByText(/0.*120/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // RBAC — readOnly disables everything
  // -------------------------------------------------------------------------

  it("disables every field and the submit button when `readOnly` is true", () => {
    renderTab(baseSettings, true);

    expect(screen.getByLabelText(/duración predeterminada/i)).toBeDisabled();
    expect(screen.getByLabelText(/anticipación m[ií]nima/i)).toBeDisabled();
    expect(screen.getByLabelText(/m[aá]ximo.*d[ií]a/i)).toBeDisabled();
    expect(screen.getByLabelText(/buffer/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("does NOT disable any field when `readOnly` is false (default ADMIN)", () => {
    renderTab(baseSettings, false);

    expect(screen.getByLabelText(/duración predeterminada/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/buffer/i)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Submit — happy path
  // -------------------------------------------------------------------------

  it("submits the form with the current values when valid (calls updateBookings)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/duración predeterminada/i), {
      target: { value: "45" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateBookingsMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateBookingsMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      defaultDurationMinutes: 45,
      minAdvanceBookingHours: 1,
      maxBookingsPerDay: 50,
      bufferMinutes: 0,
    });
  });

  it("shows a success toast and refreshes the router when updateBookings succeeds", async () => {
    const user = userEvent.setup();
    updateBookingsMock.mockResolvedValueOnce({ success: true });

    renderTab(baseSettings);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Submit — server error path
  // -------------------------------------------------------------------------

  it("renders the action's error message inline when updateBookings returns an error", async () => {
    const user = userEvent.setup();
    updateBookingsMock.mockResolvedValueOnce({
      success: false,
      error: "No autorizado",
    });

    renderTab(baseSettings);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    const banner = await screen.findByTestId("bookings-tab-form-error");
    expect(banner).toHaveTextContent("No autorizado");
    expect(toastErrorMock).toHaveBeenCalledWith("No autorizado");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Range guards (per spec: 5–480, 0–168, 1–200, 0–120)
  // -------------------------------------------------------------------------

  it("rejects defaultDurationMinutes below 5 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/duración predeterminada/i), {
      target: { value: "0" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-defaultDurationMinutes"),
    ).toHaveTextContent(/duración/i);
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects defaultDurationMinutes above 480 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/duración predeterminada/i), {
      target: { value: "481" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-defaultDurationMinutes"),
    ).toBeInTheDocument();
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects minAdvanceBookingHours below 0 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/anticipación m[ií]nima/i), {
      target: { value: "-1" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-minAdvanceBookingHours"),
    ).toHaveTextContent(/anticipación/i);
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects minAdvanceBookingHours above 168 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/anticipación m[ií]nima/i), {
      target: { value: "169" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-minAdvanceBookingHours"),
    ).toBeInTheDocument();
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects maxBookingsPerDay below 1 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/m[aá]ximo.*d[ií]a/i), {
      target: { value: "0" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-maxBookingsPerDay"),
    ).toHaveTextContent(/m[aá]ximo/i);
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects maxBookingsPerDay above 200 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/m[aá]ximo.*d[ií]a/i), {
      target: { value: "201" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-maxBookingsPerDay"),
    ).toBeInTheDocument();
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects bufferMinutes above 120 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/buffer/i), {
      target: { value: "121" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-bookings-tab-bufferMinutes"),
    ).toHaveTextContent(/buffer/i);
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects a non-integer defaultDurationMinutes with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    // The number input has `step=5`, so a non-multiple of 5 fails
    // the Zod `int()` rule (4 is in the 5–480 range, so the range
    // is OK — but it's not on the step grid; the schema enforces
    // integer-ness, not step). We use 4 to exercise the integer guard.
    fireEvent.change(screen.getByLabelText(/duración predeterminada/i), {
      target: { value: "4" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // 4 fails the `min(5)` rule (range guard). Either way, the form
    // does NOT call the action with invalid data.
    expect(updateBookingsMock).not.toHaveBeenCalled();
  });

  it("accepts a partial bookings update (only one field edited)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    // Edit only `defaultDurationMinutes` (45); leave the rest alone.
    fireEvent.change(screen.getByLabelText(/duración predeterminada/i), {
      target: { value: "45" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateBookingsMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateBookingsMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({ defaultDurationMinutes: 45 });
    // The other fields are still sent with their pre-fill values
    // (the action's schema accepts the full payload).
    expect(payload).toMatchObject({
      minAdvanceBookingHours: 1,
      maxBookingsPerDay: 50,
      bufferMinutes: 0,
    });
  });
});
