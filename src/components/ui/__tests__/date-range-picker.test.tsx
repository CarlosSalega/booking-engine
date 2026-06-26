/**
 * Tests for the `DateRangePicker` Client Component.
 *
 * The component is a popover-based range selector built on top of
 * `Calendar` (rdp v10 wrapper). It exposes an ISO string API:
 *   - `from` / `to` props are `YYYY-MM-DD` strings (or empty).
 *   - `onChange` fires with `{ from, to }` once a range is selected.
 *   - The popover stays open across clicks so users can pick the end
 *     date without dismissing.
 *
 * Spec scenarios covered (from
 * `openspec/changes/calendar-post-archive-docs/specs/date-range-picker/spec.md`):
 * - ISO String Input API: empty strings, valid range, partial range.
 * - ISO String Output API: onChange emits ISO strings on every change.
 * - Local Buffer State: popover stays open across in-progress picks.
 * - Responsive Months: 2 months on desktop, 1 on mobile.
 * - es-AR Locale Formatting: dd/MM/yy, "Desde" prefix, placeholder.
 * - Popover Trigger: Calendar icon, "Seleccionar fechas" placeholder.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  useMediaQueryMock: vi.fn().mockReturnValue(true),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mocks.useMediaQueryMock,
}));

import { DateRangePicker } from "@/components/ui/date-range-picker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the popover and return the popover content element so we can scope
 * subsequent queries to it (the trigger button is also in the DOM and
 * would otherwise match `getByRole("button")`).
 */
async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("button", { name: /seleccionar fechas/i });
  await user.click(trigger);
  return document.querySelector(
    "[data-slot='popover-content']",
  ) as HTMLElement;
}

/**
 * Pick a day inside the popover by its day-of-month. react-day-picker v10
 * renders each day as a `<button>` whose accessible name is the full
 * localized date (e.g. "miércoles, 10 de junio de 2026"). We match the
 * day number with a regex anchored to the comma-then-space prefix to
 * disambiguate "1" from "10" / "11" / "12" / "13".
 *
 * `monthIndex` lets us target a specific month grid (0 = first visible
 * month, 1 = second visible month). The first month is the current one
 * in the locale, so the test only needs it when distinguishing today vs
 * next-month duplicates.
 */
function getDayButton(
  container: HTMLElement,
  day: number,
  monthIndex = 0,
) {
  // Accessible name format: "<weekday>, <day> de <month> de <year>".
  // Anchoring on ", <day> de " avoids matching "1" inside "10" / "11".
  const dayPattern = new RegExp(`, ${day} de `);
  const buttons = within(container).getAllByRole("button", {
    name: dayPattern,
  });
  if (buttons.length === 0) {
    throw new Error(`No day button found for day ${day}`);
  }
  return buttons[monthIndex]!;
}

beforeEach(() => {
  mocks.useMediaQueryMock.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// 1.1 — Trigger opens popover with Calendar configured for desktop
// ---------------------------------------------------------------------------

describe("DateRangePicker — trigger and popover", () => {
  it("renders a trigger button labeled with the placeholder when no range is selected", () => {
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /seleccionar fechas/i });
    expect(trigger).toBeInTheDocument();
  });

  it("opens a popover with two months on desktop (≥640px)", async () => {
    const user = userEvent.setup();
    mocks.useMediaQueryMock.mockReturnValue(true);
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);
    const popover = await openPopover(user);
    // rdp v10 renders one [role="grid"] per month. With 2 months visible
    // we expect exactly 2 grids inside the popover.
    const grids = within(popover).getAllByRole("grid");
    expect(grids.length).toBe(2);
  });

  it("opens a popover with one month on mobile (<640px)", async () => {
    const user = userEvent.setup();
    mocks.useMediaQueryMock.mockReturnValue(false);
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);
    const popover = await openPopover(user);
    const grids = within(popover).getAllByRole("grid");
    expect(grids.length).toBe(1);
  });

  it("renders navigation arrows inside the popover (navLayout=around default)", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);
    const popover = await openPopover(user);
    // rdp v10 with navLayout=around emits one prev + one next per multi-month
    // display. The labels are localized — match the English fallback
    // (rdp ships "Go to the Previous Month" / "Go to the Next Month" by
    // default; with locale=es these become "Ir al mes anterior" / "Ir al mes
    // siguiente"). Match on "month" so we work in any locale.
    const prev = within(popover).getByRole("button", { name: /previous month/i });
    const next = within(popover).getByRole("button", { name: /next month/i });
    expect(prev).toBeInTheDocument();
    expect(next).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 1.2 — Range selection: rdp v10 range mode calls onSelect with
//       `{ from, to }` (rdp sets both, equal on first click) for every
//       pick. The wrapper forwards each selection to onChange as ISO
//       strings. Test the contract: ISO format + well-formed strings.
// ---------------------------------------------------------------------------

describe("DateRangePicker — range selection", () => {
  it("emits ISO-formatted strings on every range pick", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DateRangePicker from="" to="" onChange={onChange} />);
    const popover = await openPopover(user);

    // Click day 10 — rdp v10 range mode reports { from, to } with
    // both equal to the clicked day.
    const day10 = getDayButton(popover, 10);
    await user.click(day10);

    // First pick → onChange fires with from = to = clicked day.
    expect(onChange).toHaveBeenCalledTimes(1);
    const firstCall = onChange.mock.calls[0]?.[0] as {
      from: string;
      to: string;
    };
    expect(firstCall.from).toMatch(/^\d{4}-\d{2}-10$/);
    expect(firstCall.to).toMatch(/^\d{4}-\d{2}-10$/);

    // Click day 15.
    const day15 = getDayButton(popover, 15);
    await user.click(day15);

    // Second pick → onChange fires again.
    expect(onChange).toHaveBeenCalledTimes(2);
    const secondCall = onChange.mock.calls[1]?.[0] as {
      from: string;
      to: string;
    };
    // After the wrapper clears its local buffer, rdp restarts the range
    // at the new click — so from = to = 15.
    expect(secondCall.from).toMatch(/^\d{4}-\d{2}-15$/);
    expect(secondCall.to).toMatch(/^\d{4}-\d{2}-15$/);
  });
});

// ---------------------------------------------------------------------------
// 1.3 — Local buffer: first click leaves popover open
// ---------------------------------------------------------------------------

describe("DateRangePicker — local buffer state", () => {
  it("keeps the popover open after the first click so the user can pick the end date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker from="" to="" onChange={onChange} />);
    const popover = await openPopover(user);
    const day10 = getDayButton(popover, 10);
    await user.click(day10);

    // Popover is still open after first click — the content is still
    // mounted and we can find more day buttons inside it.
    const stillOpen = document.querySelector(
      "[data-slot='popover-content']",
    ) as HTMLElement;
    expect(stillOpen).toBeTruthy();
    const day20 = getDayButton(stillOpen, 20);
    expect(day20).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 1.4 — Initial value: ISO strings → trigger label
// ---------------------------------------------------------------------------

describe("DateRangePicker — initial value rendering", () => {
  it("displays the formatted range in the trigger when from/to are set", () => {
    render(
      <DateRangePicker
        from="2026-03-15"
        to="2026-03-20"
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("15/03/26");
    expect(trigger.textContent).toContain("20/03/26");
  });
});

// ---------------------------------------------------------------------------
// 1.5 — Partial range: from set, to empty
// ---------------------------------------------------------------------------

describe("DateRangePicker — partial range", () => {
  it("shows 'Desde <date>' in the trigger when only `from` is set", () => {
    render(
      <DateRangePicker
        from="2026-06-01"
        to=""
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Desde");
    expect(trigger.textContent).toContain("01/06/26");
  });
});

// ---------------------------------------------------------------------------
// 1.6 — Empty: placeholder + muted color
// ---------------------------------------------------------------------------

describe("DateRangePicker — empty state", () => {
  it("shows the 'Seleccionar fechas' placeholder in muted color when both dates are empty", () => {
    render(<DateRangePicker from="" to="" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Seleccionar fechas");
    // The muted-foreground color class is applied when !fromDate.
    expect(trigger.className).toContain("text-muted-foreground");
  });
});
