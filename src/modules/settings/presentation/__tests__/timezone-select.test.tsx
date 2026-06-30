/**
 * Tests for the `TimezoneSelect` Client Component.
 *
 * `TimezoneSelect` is a thin wrapper around a native `<select>` that
 * exposes a curated list of IANA timezones (≥15 entries). The component
 * is intentionally unstyled beyond the project's shared `data-slot`
 * input class so it slots into any form's field row.
 *
 * Contract (the assertions below are derived from this):
 *  - Native `<select>` element.
 *  - Curated list of IANA timezones (≥15 entries).
 *  - `value` prop is the currently-selected timezone.
 *  - `onChange` is called with the new timezone string when the user
 *    picks a different option.
 *  - `disabled` is forwarded to the underlying `<select>`.
 *  - `America/Argentina/Buenos_Aires` is always in the list (it's the
 *    project's default timezone per `SETTINGS_DEFAULTS.timezone`).
 *  - `id` + `aria-invalid` are forwarded (so the parent form can wire
 *    labels and validation styling).
 *
 * Spec source: `openspec/changes/settings/specs/settings-presentation/spec.md`
 *   - Requirement: Business Tab → Scenario: Timezone selection
 *   - Requirement: Form Behavior
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { TimezoneSelect, TIMEZONES } = await import("../timezone-select");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TimezoneSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a native <select> element", () => {
    render(<TimezoneSelect value="UTC" onChange={() => undefined} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
  });

  it("exposes a curated IANA list with at least 15 timezones", () => {
    // The spec requires "≥15 common IANA timezones". Asserting the
    // exported list is a public surface — it must never shrink below 15.
    expect(TIMEZONES.length).toBeGreaterThanOrEqual(15);
    // Every entry is a { value: IANA, label: string } pair.
    for (const entry of TIMEZONES) {
      expect(typeof entry.value).toBe("string");
      expect(entry.value.length).toBeGreaterThan(0);
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
    }
    // All values are unique.
    const values = TIMEZONES.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("includes America/Argentina/Buenos_Aires (project default timezone)", () => {
    const values = TIMEZONES.map((t) => t.value);
    expect(values).toContain("America/Argentina/Buenos_Aires");
  });

  it("marks the `value` prop as the currently selected option", () => {
    render(
      <TimezoneSelect
        value="America/Argentina/Buenos_Aires"
        onChange={() => undefined}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("America/Argentina/Buenos_Aires");
  });

  it("calls onChange with the new timezone string when the user picks a different option", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TimezoneSelect
        value="UTC"
        onChange={handleChange}
        data-testid="tz-select"
      />,
    );

    const select = screen.getByTestId("tz-select") as HTMLSelectElement;
    await user.selectOptions(select, "Europe/Madrid");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("Europe/Madrid");
  });

  it("forwards the `disabled` prop to the underlying <select>", () => {
    render(
      <TimezoneSelect
        value="UTC"
        onChange={() => undefined}
        disabled
        data-testid="tz-select"
      />,
    );

    expect(screen.getByTestId("tz-select")).toBeDisabled();
  });

  it("does not disable the <select> when `disabled` is omitted (default false)", () => {
    render(<TimezoneSelect value="UTC" onChange={() => undefined} data-testid="tz-select" />);

    expect(screen.getByTestId("tz-select")).not.toBeDisabled();
  });

  it("forwards the `id` prop to the underlying <select>", () => {
    render(
      <TimezoneSelect
        id="settings-timezone"
        value="UTC"
        onChange={() => undefined}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("id", "settings-timezone");
  });

  it("forwards `aria-invalid` to the underlying <select>", () => {
    render(
      <TimezoneSelect
        value="UTC"
        onChange={() => undefined}
        aria-invalid={true}
        data-testid="tz-select"
      />,
    );

    const select = screen.getByTestId("tz-select");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });

  it("renders one <option> per timezone with a Spanish-friendly label", () => {
    render(<TimezoneSelect value="UTC" onChange={() => undefined} data-testid="tz-select" />);

    const select = screen.getByTestId("tz-select");
    // 1:1 between options and the curated list.
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(TIMEZONES.length);
    // The first listed option for the project default MUST be present
    // and carry a non-empty label.
    const ba = Array.from(options).find(
      (o) => (o as HTMLOptionElement).value === "America/Argentina/Buenos_Aires",
    );
    expect(ba).toBeDefined();
    expect((ba as HTMLOptionElement).textContent).toMatch(/Buenos Aires/);
  });

  it("appends the resolved GMT offset to the option label (Intl-computed)", () => {
    // The Intl-derived offset MUST be appended as "(GMT…)" so the
    // user can scan the dropdown without having to know each zone's
    // offset by heart. The actual offset depends on the runtime /
    // DST, so we only assert the structural pattern.
    render(<TimezoneSelect value="UTC" onChange={() => undefined} data-testid="tz-select" />);

    const select = screen.getByTestId("tz-select");
    const ba = Array.from(select.querySelectorAll("option")).find(
      (o) => (o as HTMLOptionElement).value === "America/Argentina/Buenos_Aires",
    ) as HTMLOptionElement | undefined;
    expect(ba).toBeDefined();
    // The label includes the offset in parentheses. Either "GMT" (no
    // offset) or "GMT[+-]N[:MM]" — match the structural pattern.
    expect(ba!.textContent).toMatch(/\(GMT([+-][0-9:]+)?\)$/);
  });

  it("uses the Spanish city name for Latin-American timezones (es-AR tone)", () => {
    render(<TimezoneSelect value="UTC" onChange={() => undefined} data-testid="tz-select" />);

    const select = screen.getByTestId("tz-select");
    const labels = Array.from(select.querySelectorAll("option")).map(
      (o) => (o as HTMLOptionElement).textContent ?? "",
    );
    // The project deploys in Argentina — the Buenos Aires entry MUST
    // be present with the Spanish name (no translation to "Buenos
    // Aires City" or "Argentina Time Zone").
    expect(labels.some((l) => l.startsWith("Buenos Aires"))).toBe(true);
  });
});
