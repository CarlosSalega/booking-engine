/**
 * Tests for the `CancellationsTab` Client Component.
 *
 * `CancellationsTab` is the form rendered inside the Cancellations tab
 * of the settings page. It receives the cached `OrganizationSettings`
 * row (or `null` on a greenfield table) and the `readOnly` flag
 * resolved by `SettingsGuard`. The form edits the cancellation-rules
 * section of the row:
 *
 *  - `cancellationEnabled`    — boolean (Switch / toggle)
 *  - `cancellationLimitHours` — number, range 0–168
 *
 * Behaviour contract (driven by the spec):
 *
 *  - When `cancellationEnabled` is `false`, the hours field is
 *    `disabled` (the spec calls this "Toggle disables hours field").
 *  - When `cancellationEnabled` is `true`, the hours field is editable
 *    (the spec calls this "Toggle enables hours field").
 *  - `readOnly` disables BOTH controls (RBAC for SECRETARY).
 *  - Submit → client-side Zod 4 validation via
 *    `updateCancellationsSchema.safeParse(...)` (range 0–168 for the
 *    hours field).
 *  - On success → `updateCancellations` Server Action → toast success
 *    + `router.refresh()` (the action invalidates the `settings`
 *    cache server-side).
 *  - On error → render the action's user-facing Spanish message
 *    inline; toast a copy.
 *
 * Flow mirrors `BusinessTab` / `BookingsTab` — `useTransition +
 * useState` (project convention). `SETTINGS_DEFAULTS` is the
 * fallback when the row is `null`.
 *
 * Mocking strategy:
 *  - `@/modules/settings/actions` is mocked at the module boundary.
 *  - `react-hot-toast` is mocked (success / error are spies).
 *  - `next/navigation` `useRouter` is mocked (refresh is a spy).
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Cancellations Tab
 *     - Scenario: Toggle disables hours field
 *     - Scenario: Toggle enables hours field
 *   - Requirement: Form Behavior
 *     - Scenario: Successful save
 *     - Scenario: Validation error
 *     - Scenario: Server error
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the component import.
// ---------------------------------------------------------------------------

const updateCancellationsMock = vi.fn();
vi.mock("@/modules/settings/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/settings/actions")>();
  return {
    ...actual,
    updateCancellations: updateCancellationsMock,
  };
});

const refreshMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, replace: replaceMock, push: vi.fn() }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

const { CancellationsTab } = await import("../cancellations-tab");

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
  return render(<CancellationsTab settings={settings} readOnly={readOnly} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CancellationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCancellationsMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Pre-fill behaviour
  // -------------------------------------------------------------------------

  it("pre-fills the toggle (cancellationEnabled=true) and the hours field from settings", () => {
    renderTab(baseSettings);

    const toggle = screen.getByTestId("cancellations-tab-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    // The label sits in a sibling <label htmlFor> — verify it is
    // present and points to the toggle.
    expect(screen.getByText(/habilitar cancelaciones/i)).toBeInTheDocument();
    expect(
      screen.getByText(/habilitar cancelaciones/i).closest("label"),
    ).toHaveAttribute("for", "cancellations-tab-cancellationEnabled");

    const hours = screen.getByTestId("cancellations-tab-hours-input");
    expect(hours).toHaveValue(24);
  });

  it("reflects cancellationEnabled=false in the toggle's aria-checked state when the row has it disabled", () => {
    renderTab({ ...baseSettings, cancellationEnabled: false, cancellationLimitHours: 12 });

    const toggle = screen.getByTestId("cancellations-tab-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("cancellations-tab-hours-input")).toHaveValue(12);
  });

  it("falls back to SETTINGS_DEFAULTS when settings is null (greenfield)", () => {
    renderTab(null);

    // SETTINGS_DEFAULTS: cancellationEnabled=true, cancellationLimitHours=24
    const toggle = screen.getByTestId("cancellations-tab-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("cancellations-tab-hours-input")).toHaveValue(24);
  });

  // -------------------------------------------------------------------------
  // Toggle behaviour (the spec's two main scenarios)
  // -------------------------------------------------------------------------

  it("disables the hours field when cancellationEnabled is false", () => {
    renderTab({ ...baseSettings, cancellationEnabled: false, cancellationLimitHours: 12 });

    const hours = screen.getByTestId("cancellations-tab-hours-input");
    expect(hours).toBeDisabled();
  });

  it("enables the hours field when cancellationEnabled is true", () => {
    renderTab(baseSettings);

    const hours = screen.getByTestId("cancellations-tab-hours-input");
    expect(hours).not.toBeDisabled();
  });

  it("flips the toggle state when the user clicks the switch and disables the hours field", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    const toggle = screen.getByTestId("cancellations-tab-toggle");
    const hours = screen.getByTestId("cancellations-tab-hours-input");

    // Initially enabled
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(hours).not.toBeDisabled();

    // Click the toggle → hours should become disabled
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(hours).toBeDisabled();
  });

  it("re-enables the hours field when the user clicks the toggle back on", async () => {
    const user = userEvent.setup();
    renderTab({ ...baseSettings, cancellationEnabled: false, cancellationLimitHours: 12 });

    const toggle = screen.getByTestId("cancellations-tab-toggle");
    const hours = screen.getByTestId("cancellations-tab-hours-input");

    expect(hours).toBeDisabled();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(hours).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // RBAC — readOnly disables everything
  // -------------------------------------------------------------------------

  it("disables the toggle, the hours field, and the submit button when readOnly=true", () => {
    renderTab(baseSettings, true);

    expect(screen.getByTestId("cancellations-tab-toggle")).toBeDisabled();
    expect(screen.getByTestId("cancellations-tab-hours-input")).toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("does NOT disable any control when readOnly=false (default ADMIN)", () => {
    renderTab(baseSettings, false);

    expect(screen.getByTestId("cancellations-tab-toggle")).not.toBeDisabled();
    expect(screen.getByTestId("cancellations-tab-hours-input")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Submit — happy path
  // -------------------------------------------------------------------------

  it("submits the form with cancellationEnabled and cancellationLimitHours (calls updateCancellations)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    // Edit the hours value
    fireEvent.change(screen.getByTestId("cancellations-tab-hours-input"), {
      target: { value: "48" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateCancellationsMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateCancellationsMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      cancellationEnabled: true,
      cancellationLimitHours: 48,
    });
  });

  it("shows a success toast and refreshes the router when updateCancellations succeeds", async () => {
    const user = userEvent.setup();
    updateCancellationsMock.mockResolvedValueOnce({ success: true });

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

  it("submits cancellationEnabled=false while preserving the current hours value in the payload", async () => {
    const user = userEvent.setup();
    renderTab({ ...baseSettings, cancellationEnabled: true, cancellationLimitHours: 12 });

    // Click the toggle to turn cancellations OFF.
    await user.click(screen.getByTestId("cancellations-tab-toggle"));

    // Submit. The hours field is now disabled, but the current value
    // (12) is still in form state and gets sent in the payload.
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateCancellationsMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateCancellationsMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      cancellationEnabled: false,
      cancellationLimitHours: 12,
    });
  });

  // -------------------------------------------------------------------------
  // Submit — server error path
  // -------------------------------------------------------------------------

  it("renders the action's error message inline when updateCancellations returns an error", async () => {
    const user = userEvent.setup();
    updateCancellationsMock.mockResolvedValueOnce({
      success: false,
      error: "No autorizado",
    });

    renderTab(baseSettings);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    const banner = await screen.findByTestId("cancellations-tab-form-error");
    expect(banner).toHaveTextContent("No autorizado");
    expect(toastErrorMock).toHaveBeenCalledWith("No autorizado");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("renders a generic Spanish error toast when updateCancellations throws", async () => {
    const user = userEvent.setup();
    updateCancellationsMock.mockRejectedValueOnce(new Error("network down"));

    renderTab(baseSettings);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    const errorMsg = toastErrorMock.mock.calls[0]?.[0] as string;
    expect(errorMsg.toLowerCase()).toContain("intentá");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Range guards (per spec: 0–168)
  // -------------------------------------------------------------------------

  it("rejects cancellationLimitHours below 0 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByTestId("cancellations-tab-hours-input"), {
      target: { value: "-1" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-cancellations-tab-cancellationLimitHours"),
    ).toBeInTheDocument();
    expect(updateCancellationsMock).not.toHaveBeenCalled();
  });

  it("rejects cancellationLimitHours above 168 with an inline error", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByTestId("cancellations-tab-hours-input"), {
      target: { value: "169" },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-cancellations-tab-cancellationLimitHours"),
    ).toBeInTheDocument();
    expect(updateCancellationsMock).not.toHaveBeenCalled();
  });
});
