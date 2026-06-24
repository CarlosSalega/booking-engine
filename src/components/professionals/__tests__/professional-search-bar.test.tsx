/**
 * Tests for the `ProfessionalSearchBar` Client Component.
 *
 * Mirrors the `ServiceSearchBar` and `PatientSearchBar` test
 * strategies: render the component, simulate user typing, and
 * assert that `router.push` was called with the right URL
 * (with the new `?search=...` param + `?page=` reset).
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-list` — Search bar (`searchParams.search`) filters
 *   by professional name/email.
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

import { ProfessionalSearchBar } from "@/components/professionals/professional-search-bar";

beforeEach(() => {
  pushMock.mockClear();
  currentParams = new URLSearchParams();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProfessionalSearchBar — initial render", () => {
  it("renders an empty input when the URL has no ?search param", () => {
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("pre-populates the input with the current ?search= value", () => {
    currentParams = new URLSearchParams("search=garcia");
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i) as HTMLInputElement;
    expect(input.value).toBe("garcia");
  });

  it("does not show the 'Limpiar' button when the input is empty", () => {
    render(<ProfessionalSearchBar />);
    expect(
      screen.queryByRole("button", { name: /limpiar búsqueda/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Limpiar' button when the input has a value", () => {
    currentParams = new URLSearchParams("search=garcia");
    render(<ProfessionalSearchBar />);
    expect(
      screen.getByRole("button", { name: /limpiar búsqueda/i }),
    ).toBeInTheDocument();
  });
});

describe("ProfessionalSearchBar — debounced commit", () => {
  it("does NOT commit to the URL until 300ms after the last keystroke", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i);

    await user.type(input, "gar");

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
    expect(arg).toContain("search=gar");
  });

  it("resets the debounce on every keystroke", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i);

    await user.type(input, "g");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    await user.type(input, "a");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    // Total 500ms but the second keystroke reset the timer — still nothing
    expect(pushMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Now 350ms after the last keystroke → debounce fires with the full "ga"
    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=ga");
  });

  it("commits immediately when the user presses Enter (no debounce wait)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i);

    await user.type(input, "garcia{Enter}");

    // Form submit bypasses the debounce
    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=garcia");
  });

  it("resets ?page= when the search changes (lands the user on page 1)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    currentParams = new URLSearchParams("page=5");
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i);

    await user.type(input, "garcia{Enter}");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=garcia");
    expect(arg).not.toContain("page=5");
  });

  it("preserves other URL params (e.g. ?status=) when committing the search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    currentParams = new URLSearchParams("status=ACTIVE");
    render(<ProfessionalSearchBar />);
    const input = screen.getByLabelText(/buscar profesionales/i);

    await user.type(input, "garcia{Enter}");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=garcia");
    expect(arg).toContain("status=ACTIVE");
  });
});

describe("ProfessionalSearchBar — clear button", () => {
  it("clears the input and pushes ?search= (removed) when 'Limpiar' is clicked", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("search=garcia");
    render(<ProfessionalSearchBar />);

    const clearButton = screen.getByRole("button", {
      name: /limpiar búsqueda/i,
    });
    await user.click(clearButton);

    const input = screen.getByLabelText(/buscar profesionales/i) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).not.toContain("search=");
    expect(arg).toMatch(/^\/dashboard\/professionals/);
  });
});
