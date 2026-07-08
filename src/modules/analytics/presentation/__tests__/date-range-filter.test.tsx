/**
 * Tests for DateRangeFilter — Client Component with presets + custom.
 *
 * Verifies preset button clicks trigger URL update, custom range
 * validation, and useTransition behavior.
 *
 * Spec: ANP-002 (DateRangeFilter).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DateRangeFilter } from "../date-range-filter";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("preset=30d"),
  usePathname: () => "/dashboard/analytics",
}));

describe("DateRangeFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all preset buttons with Spanish labels", () => {
    render(<DateRangeFilter />);

    expect(screen.getByRole("button", { name: "7 días" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 días" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 meses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "6 meses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Personalizado" })).toBeInTheDocument();
  });

  it("highlights the active preset based on searchParams", () => {
    render(<DateRangeFilter />);

    const activeButton = screen.getByRole("button", { name: "30 días" });
    expect(activeButton).toHaveAttribute("data-state", "active");
  });

  it("updates URL when a preset button is clicked", async () => {
    const user = userEvent.setup();
    render(<DateRangeFilter />);

    await user.click(screen.getByRole("button", { name: "7 días" }));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("preset=7d"),
    );
  });

  it("shows custom date inputs when Personalizado is selected", async () => {
    const user = userEvent.setup();
    render(<DateRangeFilter />);

    await user.click(screen.getByRole("button", { name: "Personalizado" }));

    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();
  });

  it("validates custom range: from must be before to", async () => {
    const user = userEvent.setup();
    render(<DateRangeFilter />);

    // Switch to custom mode
    await user.click(screen.getByRole("button", { name: "Personalizado" }));
    // Clear the mock from the preset switch
    mockReplace.mockClear();

    const fromInput = screen.getByLabelText("Desde");
    const toInput = screen.getByLabelText("Hasta");

    // Set from AFTER to
    await user.type(fromInput, "2026-01-31");
    await user.type(toInput, "2026-01-01");

    // Submit the custom range
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByText("La fecha desde debe ser anterior a hasta")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
