/**
 * Tests for the `PaymentSearchBar` Client Component.
 *
 * Mirrors the `PatientSearchBar` and `ProfessionalSearchBar` test
 * strategies: render the component, simulate user typing, and
 * assert that `router.push` was called with the right URL
 * (with the new `?search=...` param + `?page=` reset).
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — Search input: `<PaymentSearchBar>`
 *   Client Component with debounced input (by booking/patient name).
 * - The current `?search=` value is pre-populated from the URL.
 * - The search is debounced 300ms.
 * - "Limpiar" button clears the input + URL.
 * - Search changes reset pagination to page 1.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => currentParams,
}));

import { PaymentSearchBar } from "@/components/payments/payment-search-bar";

beforeEach(() => {
  pushMock.mockClear();
  currentParams = new URLSearchParams();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe("PaymentSearchBar — initial render", () => {
  it("renders an empty input when the URL has no ?search param", () => {
    render(<PaymentSearchBar />);
    const input = screen.getByLabelText(/buscar pagos/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("pre-populates the input with the current ?search= value", () => {
    currentParams = new URLSearchParams("search=maria");
    render(<PaymentSearchBar />);
    const input = screen.getByLabelText(/buscar pagos/i) as HTMLInputElement;
    expect(input.value).toBe("maria");
  });

  it("does not show the 'Limpiar' button when the input is empty", () => {
    render(<PaymentSearchBar />);
    expect(
      screen.queryByRole("button", { name: /limpiar búsqueda/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Limpiar' button when the input has a value", () => {
    currentParams = new URLSearchParams("search=maria");
    render(<PaymentSearchBar />);
    expect(
      screen.getByRole("button", { name: /limpiar búsqueda/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Debounced commit
// ---------------------------------------------------------------------------

describe("PaymentSearchBar — debounced commit", () => {
  it("does NOT commit to the URL until 300ms after the last keystroke", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PaymentSearchBar />);
    const input = screen.getByLabelText(/buscar pagos/i);

    await user.type(input, "mar");

    // Before 300ms — nothing pushed yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(pushMock).not.toHaveBeenCalled();

    // After 300ms total — debounce fires
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=mar");
  });

  it("commits immediately when the user presses Enter (no debounce wait)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PaymentSearchBar />);
    const input = screen.getByLabelText(/buscar pagos/i);

    await user.type(input, "maria{Enter}");

    // Form submit bypasses the debounce
    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=maria");
  });

  it("resets ?page= when the search changes (lands the user on page 1)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    currentParams = new URLSearchParams("page=5");
    render(<PaymentSearchBar />);
    const input = screen.getByLabelText(/buscar pagos/i);

    await user.type(input, "maria{Enter}");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=maria");
    expect(arg).not.toContain("page=5");
  });

  it("preserves other URL params (e.g. ?status=) when committing the search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    currentParams = new URLSearchParams("status=PENDING");
    render(<PaymentSearchBar />);
    const input = screen.getByLabelText(/buscar pagos/i);

    await user.type(input, "maria{Enter}");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=maria");
    expect(arg).toContain("status=PENDING");
  });
});

// ---------------------------------------------------------------------------
// Clear button
// ---------------------------------------------------------------------------

describe("PaymentSearchBar — clear button", () => {
  it("clears the input and pushes ?search= (removed) when 'Limpiar' is clicked", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("search=maria");
    render(<PaymentSearchBar />);

    const clearButton = screen.getByRole("button", {
      name: /limpiar búsqueda/i,
    });
    await user.click(clearButton);

    const input = screen.getByLabelText(/buscar pagos/i) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).not.toContain("search=");
    expect(arg).toMatch(/^\/dashboard\/payments/);
  });
});
