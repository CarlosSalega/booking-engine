/**
 * Tests for the `ProfessionalStatusFilter` Client Component.
 *
 * Mirrors the `ServiceStatusFilter` and `PatientStatusFilter` test
 * strategy: render the component, simulate a `change` event on the
 * native `<select>` and assert that `router.push` was called with
 * the right URL (with the new `?status=...` param + `?page=` reset).
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

import { ProfessionalStatus } from "@/modules/professionals/domain/professional";
import { ProfessionalStatusFilter } from "@/components/professionals/professional-status-filter";

beforeEach(() => {
  pushMock.mockClear();
  currentParams = new URLSearchParams();
});

describe("ProfessionalStatusFilter — initial render", () => {
  it("renders the three options: Todos, Activo, Inactivo", () => {
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId("professional-status-filter");
    const options = Array.from(select.querySelectorAll("option"));
    const labels = options.map((o) => o.textContent);
    expect(labels).toEqual(["Todos", "Activo", "Inactivo"]);
  });

  it("pre-selects 'Todos' when the URL has no ?status param", () => {
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId(
      "professional-status-filter",
    ) as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("pre-selects ACTIVE when the URL has ?status=ACTIVE", () => {
    currentParams = new URLSearchParams("status=ACTIVE");
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId(
      "professional-status-filter",
    ) as HTMLSelectElement;
    expect(select.value).toBe(ProfessionalStatus.ACTIVE);
  });

  it("pre-selects INACTIVE when the URL has ?status=INACTIVE", () => {
    currentParams = new URLSearchParams("status=INACTIVE");
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId(
      "professional-status-filter",
    ) as HTMLSelectElement;
    expect(select.value).toBe(ProfessionalStatus.INACTIVE);
  });
});

describe("ProfessionalStatusFilter — change handler", () => {
  it("pushes a URL with ?status=ACTIVE when ACTIVE is selected", async () => {
    const user = userEvent.setup();
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId("professional-status-filter");

    await user.selectOptions(select, ProfessionalStatus.ACTIVE);

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=ACTIVE");
    expect(arg).toMatch(/^\/dashboard\/professionals/);
  });

  it("pushes a URL with ?status=INACTIVE when INACTIVE is selected", async () => {
    const user = userEvent.setup();
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId("professional-status-filter");

    await user.selectOptions(select, ProfessionalStatus.INACTIVE);

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=INACTIVE");
  });

  it("removes ?status= when 'Todos' is selected", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("status=ACTIVE");
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId("professional-status-filter");

    await user.selectOptions(select, "");

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).not.toContain("status=");
    expect(arg).toMatch(/^\/dashboard\/professionals/);
  });

  it("resets ?page= to 1 when the filter changes (so the user lands on page 1)", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("page=5&status=ACTIVE");
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId("professional-status-filter");

    await user.selectOptions(select, ProfessionalStatus.INACTIVE);

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("status=INACTIVE");
    expect(arg).not.toContain("page=5");
  });

  it("preserves other URL params (e.g. ?search=) when changing the filter", async () => {
    const user = userEvent.setup();
    currentParams = new URLSearchParams("search=garcia");
    render(<ProfessionalStatusFilter />);
    const select = screen.getByTestId("professional-status-filter");

    await user.selectOptions(select, ProfessionalStatus.ACTIVE);

    const arg = pushMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("search=garcia");
    expect(arg).toContain("status=ACTIVE");
  });
});
