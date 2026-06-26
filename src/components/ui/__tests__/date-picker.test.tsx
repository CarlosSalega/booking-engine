/**
 * Tests for the `DatePicker` Client Component.
 *
 * The component is a popover-based single-date selector built on top of
 * `Calendar` (rdp v10 wrapper). It exposes an ISO string API:
 *   - `value` prop is `YYYY-MM-DD` (or empty).
 *   - `onChange` fires with the new ISO string when the user picks.
 *   - An optional `placeholder` is shown when no date is selected.
 *
 * The trigger is fully controlled — `value=""` always resets the display
 * to the placeholder, regardless of any internal state.
 *
 * Spec scenarios covered (from
 * `openspec/changes/calendar-post-archive-docs/specs/date-picker/spec.md`):
 * - ISO String Input and Output API: valid value, empty value, selection.
 * - Controlled Value Rendering: parent updates value, display updates.
 * - es-AR Locale Formatting: dd/MM/yy.
 * - Popover Trigger: Calendar icon, label.
 * - Placeholder Support: custom + default.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "@/components/ui/date-picker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the popover and return the popover content element.
 */
async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  // The trigger is the only button in the rendered output.
  const trigger = screen.getByRole("button");
  await user.click(trigger);
  return document.querySelector(
    "[data-slot='popover-content']",
  ) as HTMLElement;
}

/**
 * Pick a day inside the popover by its day-of-month. react-day-picker v10
 * renders each day as a `<button>` whose accessible name is the full
 * localized date.
 */
function getDayButton(container: HTMLElement, day: number) {
  // Accessible name format: "<weekday>, <day> de <month> de <year>".
  // Anchoring on ", <day> de " avoids matching "1" inside "10" / "11".
  const dayPattern = new RegExp(`, ${day} de `);
  return within(container).getByRole("button", { name: dayPattern });
}

// ---------------------------------------------------------------------------
// 1.12 — Custom placeholder / default placeholder
// ---------------------------------------------------------------------------

describe("DatePicker — placeholder", () => {
  it("shows the default 'Seleccionar fecha' placeholder when no value and no placeholder prop", () => {
    render(<DatePicker value="" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Seleccionar fecha");
    expect(trigger.className).toContain("text-muted-foreground");
  });

  it("shows a custom placeholder when value is empty and placeholder is provided", () => {
    render(
      <DatePicker
        value=""
        placeholder="Elegir fecha"
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Elegir fecha");
    expect(trigger.className).toContain("text-muted-foreground");
  });
});

// ---------------------------------------------------------------------------
// 1.13 — Date selection flow: open → click day → onChange(ISO) + trigger label
// ---------------------------------------------------------------------------

describe("DatePicker — date selection", () => {
  it("calls onChange with an ISO string when the user picks a day", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);

    const popover = await openPopover(user);
    const day15 = getDayButton(popover, 15);
    await user.click(day15);

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0]?.[0] as string;
    expect(arg).toMatch(/^\d{4}-\d{2}-15$/);
  });
});

// ---------------------------------------------------------------------------
// 1.14 — es-AR dd/MM/yy format in trigger
// ---------------------------------------------------------------------------

describe("DatePicker — date formatting", () => {
  it("renders the value as '26/06/26' (es-AR dd/MM/yy) in the trigger", () => {
    render(<DatePicker value="2026-06-26" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("26/06/26");
    // When a date is selected, the muted-foreground class is gone.
    expect(trigger.className).not.toContain("text-muted-foreground");
  });
});

// ---------------------------------------------------------------------------
// 1.15 — Parent-controlled reset: set value="" → placeholder shown
// ---------------------------------------------------------------------------

describe("DatePicker — fully controlled value", () => {
  it("shows the placeholder when the parent sets value to ''", () => {
    const { rerender } = render(
      <DatePicker value="2026-06-26" onChange={vi.fn()} />,
    );
    // Initially shows the formatted date.
    expect(screen.getByRole("button").textContent).toContain("26/06/26");

    // Parent resets the value.
    rerender(<DatePicker value="" onChange={vi.fn()} />);

    // The trigger should now show the placeholder + muted color.
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Seleccionar fecha");
    expect(trigger.className).toContain("text-muted-foreground");
  });
});
