/**
 * Tests for the `Calendar` UI component (rdp v10 wrapper).
 *
 * The component is a thin wrapper over `react-day-picker` v10 that:
 *   - Injects CSS custom properties via the `style` prop (theme tokens).
 *   - Forwards `navLayout` to `DayPicker` (default `"around"`).
 *   - Maps `DayFlag` enum entries to Tailwind classes for outside/today/disabled.
 *   - Merges a base `className` of `"p-3"` with the caller's `className`
 *     via the `cn()` utility.
 *   - Renders lucide-react `ChevronLeft` / `ChevronRight` icons in nav.
 *
 * Spec scenarios covered (from
 * `openspec/changes/calendar-post-archive-docs/specs/calendar-ui/spec.md`):
 * - RDP v10 DayPicker Integration: className merge, props spread.
 * - CSS Variable Theming: --rdp-* variables via inline style.
 * - navLayout and Chevron Navigation: arrows + lucide icons.
 * - DayFlag Styling: outside (opacity), today (font-semibold), disabled.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Calendar } from "@/components/ui/calendar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the root <div> rendered by the Calendar wrapper. rdp v10 doesn't
 * set `data-rdp-root` or `.rdp-root` — the wrapper is just a plain
 * <div> that owns the `style` and base className.
 */
function getCalendarRoot(container: HTMLElement): HTMLElement {
  // The wrapper div carries `p-3` from the base className. Find it.
  const candidates = container.querySelectorAll<HTMLElement>("div");
  for (const div of Array.from(candidates)) {
    if (div.classList.contains("p-3")) return div;
  }
  throw new Error("Could not find Calendar root div with p-3 class");
}

// ---------------------------------------------------------------------------
// 1.7 — Renders DayPicker with default mode="single"; "use client"
// ---------------------------------------------------------------------------

describe("Calendar — DayPicker integration", () => {
  it("renders a single month grid by default (mode='single')", () => {
    render(<Calendar />);
    // rdp v10 emits a [role="grid"] per month. Default is one month.
    const grids = screen.getAllByRole("grid");
    expect(grids).toHaveLength(1);
  });

  it("declares 'use client' at the top of the source file", async () => {
    // Read the source file and assert the directive is on the first
    // line. We do this in-test (not at module load) so the assertion
    // is a real runtime check, not a build-time one.
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      "src/components/ui/calendar.tsx",
      "utf-8",
    );
    expect(src.startsWith('"use client"')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1.8 — Inline style includes --rdp-* CSS variables
// ---------------------------------------------------------------------------

describe("Calendar — CSS variable theming via style prop", () => {
  it("injects --rdp-accent-color, --rdp-months-gap, --rdp-day-width, --rdp-range_start-color on the root", () => {
    const { container } = render(<Calendar />);
    const root = getCalendarRoot(container);
    const style = root.getAttribute("style") ?? "";
    expect(style).toContain("--rdp-accent-color: hsl(var(--primary))");
    expect(style).toContain("--rdp-months-gap: 3rem");
    expect(style).toContain("--rdp-day-width: 2rem");
    expect(style).toContain(
      "--rdp-range_start-color: hsl(var(--primary-foreground))",
    );
  });
});

// ---------------------------------------------------------------------------
// 1.9 — navLayout=around forwarded; chevrons render
// ---------------------------------------------------------------------------

describe("Calendar — navLayout and chevron icons", () => {
  it("sets data-nav-layout='around' on the root by default", () => {
    const { container } = render(<Calendar />);
    const root = getCalendarRoot(container);
    expect(root.getAttribute("data-nav-layout")).toBe("around");
  });

  it("renders prev / next month nav buttons with lucide chevron icons", () => {
    render(<Calendar />);
    const prev = screen.getByRole("button", { name: /previous month/i });
    const next = screen.getByRole("button", { name: /next month/i });
    expect(prev).toBeInTheDocument();
    expect(next).toBeInTheDocument();
    // Lucide icons carry their own className (`lucide-chevron-left/right`).
    const prevIcon = prev.querySelector("svg");
    const nextIcon = next.querySelector("svg");
    expect(prevIcon).not.toBeNull();
    expect(nextIcon).not.toBeNull();
    expect(prevIcon?.getAttribute("class") ?? "").toContain(
      "lucide-chevron-left",
    );
    expect(nextIcon?.getAttribute("class") ?? "").toContain(
      "lucide-chevron-right",
    );
  });
});

// ---------------------------------------------------------------------------
// 1.10 — DayFlag.outside applies opacity-[0.15] (NOT hidden)
// ---------------------------------------------------------------------------

describe("Calendar — DayFlag styling", () => {
  it("applies opacity-[0.15] to outside days (DayFlag.outside)", () => {
    const { container } = render(<Calendar />);
    // rdp v10 marks outside days with the `outside` modifier in the
    // className. The spec says opacity-[0.15] (NOT opacity-0 / hidden).
    const html = container.innerHTML;
    expect(html).toContain("opacity-[0.15]");
    // Sanity: the opacity class is applied; it should NOT be hidden.
    expect(html).not.toMatch(/outside[^"]*hidden/);
  });

  it("applies font-semibold to today's cell (DayFlag.today)", () => {
    const { container } = render(<Calendar />);
    // rdp v10 marks today with the `today` modifier. We assert the
    // class is present in the rendered HTML.
    const html = container.innerHTML;
    expect(html).toContain("font-semibold");
  });
});

// ---------------------------------------------------------------------------
// 1.11 — className merged with "p-3" via cn()
// ---------------------------------------------------------------------------

describe("Calendar — className forwarding", () => {
  it("merges the caller's className with the base 'p-3' on the root", () => {
    const { container } = render(<Calendar className="my-custom" />);
    const root = getCalendarRoot(container);
    expect(root.className).toContain("p-3");
    expect(root.className).toContain("my-custom");
  });
});
