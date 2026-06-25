/**
 * Tests for the `ProfessionalStatusFilter` Client Component.
 *
 * Uses the shadcn/ui `Select` (Radix under the hood). The trigger is a
 * `<button role="combobox">`; options render in a portal with
 * `role="option"`. Selection flow: click trigger → click option.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-list` — Status filter (`searchParams.status`) with
 *   ACTIVE/INACTIVE options.
 * - Filter changes reset pagination to page 1.
 * - The current `?status=` value is pre-populated from the URL.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { ProfessionalStatusFilter } from "@/components/professionals/professional-status-filter";

beforeEach(() => {
  pushMock.mockClear();
  currentParams = new URLSearchParams();
});

async function selectOption(label: string) {
  const user = userEvent.setup();
  const trigger = screen.getByTestId("professional-status-filter");
  await user.click(trigger);
  await user.click(screen.getByRole("option", { name: label }));
}

function currentDisplayText(): string {
  const trigger = screen.getByTestId("professional-status-filter");
  return trigger.textContent ?? "";
}

describe("ProfessionalStatusFilter — initial render", () => {
  it("renders the three options: Todos, Activo, Inactivo", async () => {
    const user = userEvent.setup();
    render(<ProfessionalStatusFilter />);

    const trigger = screen.getByTestId("professional-status-filter");
    await user.click(trigger);

    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.textContent);
    expect(labels).toEqual(["Todos", "Activo", "Inactivo"]);
  });

  it("pre-selects 'Todos' when the URL has no ?status param", () => {
    render(<ProfessionalStatusFilter />);
    expect(currentDisplayText()).toBe("Todos");
  });

  it("pre-selects ACTIVE when the URL has ?status=ACTIVE", () => {
    currentParams = new URLSearchParams("status=ACTIVE");
    render(<ProfessionalStatusFilter />);
    expect(currentDisplayText()).toBe("Activo");
  });

  it("pre-selects INACTIVE when the URL has ?status=INACTIVE", () => {
    currentParams = new URLSearchParams("status=INACTIVE");
    render(<ProfessionalStatusFilter />);
    expect(currentDisplayText()).toBe("Inactivo");
  });
});

describe("ProfessionalStatusFilter — change handler", () => {
  it("pushes a URL with ?status=ACTIVE when ACTIVE is selected", async () => {
    render(<ProfessionalStatusFilter />);

    await selectOption("Activo");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=ACTIVE");
    expect(arg).toMatch(/^\/dashboard\/professionals/);
  });

  it("pushes a URL with ?status=INACTIVE when INACTIVE is selected", async () => {
    render(<ProfessionalStatusFilter />);

    await selectOption("Inactivo");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=INACTIVE");
  });

  it("removes ?status= when 'Todos' is selected", async () => {
    currentParams = new URLSearchParams("status=ACTIVE");
    render(<ProfessionalStatusFilter />);

    await selectOption("Todos");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).not.toContain("status=");
    expect(arg).toMatch(/^\/dashboard\/professionals/);
  });

  it("resets ?page= to 1 when the filter changes (so the user lands on page 1)", async () => {
    currentParams = new URLSearchParams("page=5&status=ACTIVE");
    render(<ProfessionalStatusFilter />);

    await selectOption("Inactivo");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=INACTIVE");
    expect(arg).not.toContain("page=5");
  });

  it("preserves other URL params (e.g. ?search=) when changing the filter", async () => {
    currentParams = new URLSearchParams("search=garcia");
    render(<ProfessionalStatusFilter />);

    await selectOption("Activo");

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=garcia");
    expect(arg).toContain("status=ACTIVE");
  });
});
