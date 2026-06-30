/**
 * Tests for the `BusinessTab` Client Component.
 *
 * `BusinessTab` is the form rendered inside the Business tab of the
 * settings page. It receives the cached `OrganizationSettings` row
 * (or `null` on a greenfield table) and the `readOnly` flag resolved
 * by `SettingsGuard`. The form follows the project's standard
 * `useTransition + useState` pattern (see `ServiceForm`):
 *
 *  1. Local `values` state pre-filled from the `settings` prop (or
 *     from `SETTINGS_DEFAULTS` when the row is `null`).
 *  2. Submit → client-side Zod 4 validation via the action schema
 *     `updateBusinessSchema`.
 *  3. On success → call the `updateBusiness` Server Action → toast
 *     success → `router.refresh()` so the cached `getSettings` re-reads.
 *  4. On error → render an inline error banner (with the action's
 *     user-facing Spanish message); keep entered values.
 *  5. `readOnly` disables every input AND the submit button.
 *
 * Mocking strategy:
 *  - `@/modules/settings/actions` is mocked at the module boundary so
 *    the test never calls into the real Server Action.
 *  - `react-hot-toast` is mocked (success / error calls are spies).
 *  - `next/navigation` `useRouter` is mocked (refresh + replace are
 *    spies).
 *  - No real form submission — we fire `submit` events on the
 *    `<form>` directly. `userEvent` is used for the user-style input
 *    interactions (typing, picking an option).
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Tabbed Settings Page → Scenario: Settings load from cache
 *   - Requirement: Form Behavior
 *     - Scenario: Successful save
 *     - Scenario: Validation error
 *     - Scenario: Server error
 *   - Requirement: RBAC-Gated Views → Scenario: Secretary read-only
 *   - Requirement: Business Tab → Scenario: Timezone selection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the component import.
// ---------------------------------------------------------------------------

const updateBusinessMock = vi.fn();
vi.mock("@/modules/settings/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/settings/actions")>();
  return {
    ...actual,
    updateBusiness: updateBusinessMock,
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

const { BusinessTab } = await import("../business-tab");

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
  return render(<BusinessTab settings={settings} readOnly={readOnly} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BusinessTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateBusinessMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Pre-fill behaviour
  // -------------------------------------------------------------------------

  it("pre-fills all fields from the `settings` prop", () => {
    renderTab(baseSettings);

    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Clínica Demo");
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("Atención integral");
    expect(screen.getByLabelText(/dirección/i)).toHaveValue("Av. Siempre Viva 742");
    expect(screen.getByLabelText(/tel[eé]fono/i)).toHaveValue("+5491144440000");
    expect(screen.getByLabelText(/email/i)).toHaveValue("demo@clinica.test");
  });

  it("pre-selects the timezone in the TimezoneSelect (matches the settings row)", () => {
    renderTab(baseSettings);

    const select = screen.getByLabelText(/zona horaria/i) as HTMLSelectElement;
    expect(select.value).toBe("America/Argentina/Buenos_Aires");
  });

  it("falls back to SETTINGS_DEFAULTS when `settings` is null (greenfield)", () => {
    renderTab(null);

    // name falls back to the default empty string
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
    // description, address, phone, email fall back to empty
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("");
    expect(screen.getByLabelText(/dirección/i)).toHaveValue("");
    expect(screen.getByLabelText(/tel[eé]fono/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
    // timezone falls back to America/Argentina/Buenos_Aires (the default)
    const select = screen.getByLabelText(/zona horaria/i) as HTMLSelectElement;
    expect(select.value).toBe("America/Argentina/Buenos_Aires");
  });

  // -------------------------------------------------------------------------
  // RBAC — readOnly disables everything
  // -------------------------------------------------------------------------

  it("disables every field and the submit button when `readOnly` is true", () => {
    renderTab(baseSettings, true);

    expect(screen.getByLabelText(/nombre/i)).toBeDisabled();
    expect(screen.getByLabelText(/descripción/i)).toBeDisabled();
    expect(screen.getByLabelText(/dirección/i)).toBeDisabled();
    expect(screen.getByLabelText(/zona horaria/i)).toBeDisabled();
    expect(screen.getByLabelText(/tel[eé]fono/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("does NOT disable any field when `readOnly` is false (default ADMIN)", () => {
    renderTab(baseSettings, false);

    expect(screen.getByLabelText(/nombre/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/descripción/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/email/i)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Submit — happy path
  // -------------------------------------------------------------------------

  it("submits the form with the current values when valid (calls updateBusiness)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Clínica Nueva");

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateBusinessMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateBusinessMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      name: "Clínica Nueva",
      description: "Atención integral",
      address: "Av. Siempre Viva 742",
      timezone: "America/Argentina/Buenos_Aires",
      phone: "+5491144440000",
      email: "demo@clinica.test",
    });
  });

  it("shows a success toast and refreshes the router when updateBusiness succeeds", async () => {
    const user = userEvent.setup();
    updateBusinessMock.mockResolvedValueOnce({ success: true });

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

  it("renders the action's error message inline when updateBusiness returns an error", async () => {
    const user = userEvent.setup();
    updateBusinessMock.mockResolvedValueOnce({
      success: false,
      error: "No autorizado",
    });

    renderTab(baseSettings);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // The error banner surfaces the action's message verbatim.
    const banner = await screen.findByTestId("business-tab-form-error");
    expect(banner).toHaveTextContent("No autorizado");
    // We DO call toast.error (mirrors the project's other forms) so
    // the user sees a visible cue even when scrolled away from the
    // banner.
    expect(toastErrorMock).toHaveBeenCalledWith("No autorizado");
    // No refresh on failure.
    expect(refreshMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Submit — Zod client-side validation
  // -------------------------------------------------------------------------

  it("shows an inline email error and does NOT call updateBusiness when email is invalid", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "not-an-email");

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // Inline field error visible.
    expect(
      await screen.findByTestId("field-error-business-tab-email"),
    ).toHaveTextContent(/email/i);
    // Banner summarizes the failure.
    expect(
      screen.getByTestId("business-tab-form-error"),
    ).toHaveTextContent(/revisá/i);
    // Server action NOT called.
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  it("shows an inline phone error and does NOT call updateBusiness when phone is malformed", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    await user.clear(screen.getByLabelText(/tel[eé]fono/i));
    await user.type(screen.getByLabelText(/tel[eé]fono/i), "abc");

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-business-tab-phone"),
    ).toHaveTextContent(/tel[eé]fono/i);
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  it("shows an inline name error and does NOT call updateBusiness when name is empty", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    await user.clear(screen.getByLabelText(/nombre/i));

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-business-tab-name"),
    ).toHaveTextContent(/nombre/i);
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  it("allows an empty optional field (email) to clear the value (sends undefined or empty string)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    await user.clear(screen.getByLabelText(/email/i));

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateBusinessMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateBusinessMock.mock.calls[0]?.[0] as Record<string, unknown>;
    // The form passes an empty string for cleared optionals — the
    // action's Zod schema treats "" as missing (it's `nullish()`).
    expect(payload["email"]).toBeFalsy();
  });

  it("updates the timezone on the payload when the user picks a different option", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    const select = screen.getByLabelText(/zona horaria/i);
    await user.selectOptions(select, "Europe/Madrid");

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateBusinessMock).toHaveBeenCalledTimes(1);
    });
    const payload = updateBusinessMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({ timezone: "Europe/Madrid" });
  });

  // -------------------------------------------------------------------------
  // Additional range / length guards (triangulation)
  // -------------------------------------------------------------------------

  it("rejects a name longer than 100 characters (inline error)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "a".repeat(101));

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-business-tab-name"),
    ).toBeInTheDocument();
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  it("rejects a description longer than 500 characters (inline error)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    // The textarea has HTML `maxLength={500}` which caps user.type.
    // We bypass it with fireEvent.change — the form's Zod validation
    // runs against the actual state value, not the browser cap.
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "a".repeat(501) },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-business-tab-description"),
    ).toBeInTheDocument();
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  it("rejects an address longer than 200 characters (inline error)", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    fireEvent.change(screen.getByLabelText(/dirección/i), {
      target: { value: "a".repeat(201) },
    });

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByTestId("field-error-business-tab-address"),
    ).toBeInTheDocument();
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Concurrent fields preserved + value retention
  // -------------------------------------------------------------------------

  it("preserves concurrent field edits when only one fails validation", async () => {
    const user = userEvent.setup();
    renderTab(baseSettings);

    // User edits the address (valid) and breaks the email (invalid).
    await user.clear(screen.getByLabelText(/dirección/i));
    await user.type(screen.getByLabelText(/dirección/i), "Nueva dirección");
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "not-an-email");

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // The address value is preserved on the input.
    expect(screen.getByLabelText(/dirección/i)).toHaveValue("Nueva dirección");
    // The email is preserved too (the user can fix it without
    // re-typing).
    expect(screen.getByLabelText(/email/i)).toHaveValue("not-an-email");
    // The email field has the inline error.
    expect(
      await screen.findByTestId("field-error-business-tab-email"),
    ).toBeInTheDocument();
    expect(updateBusinessMock).not.toHaveBeenCalled();
  });

  it("renders a generic Spanish error toast when updateBusiness throws", async () => {
    const user = userEvent.setup();
    updateBusinessMock.mockRejectedValueOnce(new Error("network down"));

    renderTab(baseSettings);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    const errorMsg = toastErrorMock.mock.calls[0]?.[0] as string;
    expect(errorMsg.toLowerCase()).toContain("intentá");
    // The form does NOT refresh on a thrown error.
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
