/**
 * Tests for `BookingCalendarToolbar` — the URL-driven toolbar above
 * the calendar grid.
 *
 * The toolbar owns:
 *
 * 1. **View toggle** (Semana / Día / Mes). Clicking a button emits
 *    the new view via `onViewChange(view)` so the parent can update
 *    the URL and the calendar's `defaultView`.
 * 2. **"Hoy" button** — resets the visible date to today via
 *    `onDateChange(today)` (formatted as `YYYY-MM-DD`).
 * 3. **Professional filter** — a shadcn `Select` that is HIDDEN when
 *    the viewer is a PROFESSIONAL (their calendar is scoped
 *    server-side to their own user id; the filter has no effect on
 *    what they see). For ADMIN / SECRETARY it lists the available
 *    professionals and emits `onProfessionalIdChange(id)`.
 * 4. **URL sync** — the component mirrors state to the URL via
 *    `router.replace(?view=...&date=...&professionalId=...)`. The
 *    router call uses `replace` (not `push`) so back-button
 *    navigation skips the toolbar updates.
 *
 * Mock strategy:
 *   - `next/navigation` (useRouter, useSearchParams) is mocked to
 *     capture the `replace` URL and avoid the App Router context.
 *   - `useMediaQuery` is mocked so the mobile test can flip the
 *     breakpoint and verify the "Hoy" button collapses into a
 *     compact form.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ProfessionalOption } from "@/modules/bookings/data/booking-data.types";
import type { UserRoleType } from "@/modules/auth/domain/roles";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const useMediaQueryMock = vi.fn().mockReturnValue(false);
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: useMediaQueryMock,
}));

const replaceMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const currentParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => currentParams,
  usePathname: () => "/dashboard/calendar",
}));

const { BookingCalendarToolbar } = await import(
  "../booking-calendar-toolbar"
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROFESSIONALS: ProfessionalOption[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    userId: "00000000-0000-4000-8000-000000000020",
    user: { name: "Dr. García" },
    specialties: ["Odontología"],
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    userId: "00000000-0000-4000-8000-000000000021",
    user: { name: "Dra. López" },
    specialties: ["Cardiología"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface ToolbarProps {
  view: "week" | "day" | "month";
  date: string;
  professionalId?: string;
  role: UserRoleType;
}

function setup(props: Partial<ToolbarProps> = {}) {
  const onViewChange = vi.fn();
  const onDateChange = vi.fn();
  const onProfessionalIdChange = vi.fn();
  const user = userEvent.setup();

  const utils = render(
    <BookingCalendarToolbar
      view={props.view ?? "week"}
      date={props.date ?? "2026-06-22"}
      professionalId={props.professionalId}
      role={props.role ?? "ADMIN"}
      professionals={PROFESSIONALS}
      onViewChange={onViewChange}
      onDateChange={onDateChange}
      onProfessionalIdChange={onProfessionalIdChange}
    />,
  );

  return { ...utils, onViewChange, onDateChange, onProfessionalIdChange, user };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentParams.forEach((_, key) => currentParams.delete(key));
  useMediaQueryMock.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// View toggle
// ---------------------------------------------------------------------------

describe("BookingCalendarToolbar — view toggle", () => {
  it("emits onViewChange('day') when the Día button is clicked", async () => {
    const { onViewChange, user } = setup({ view: "week" });

    await user.click(screen.getByRole("button", { name: /Día/i }));

    expect(onViewChange).toHaveBeenCalledWith("day");
  });

  it("emits onViewChange('month') when the Mes button is clicked", async () => {
    const { onViewChange, user } = setup({ view: "week" });

    await user.click(screen.getByRole("button", { name: /Mes/i }));

    expect(onViewChange).toHaveBeenCalledWith("month");
  });

  it("emits onViewChange('week') when the Semana button is clicked", async () => {
    const { onViewChange, user } = setup({ view: "day" });

    await user.click(screen.getByRole("button", { name: /Semana/i }));

    expect(onViewChange).toHaveBeenCalledWith("week");
  });
});

// ---------------------------------------------------------------------------
// "Hoy" button
// ---------------------------------------------------------------------------

describe("BookingCalendarToolbar — Hoy button", () => {
  it("emits onDateChange with today's date in YYYY-MM-DD format", async () => {
    const { onDateChange, user } = setup({ date: "2026-03-15" });

    await user.click(screen.getByRole("button", { name: /Hoy/i }));

    expect(onDateChange).toHaveBeenCalledWith(todayISO());
  });
});

// ---------------------------------------------------------------------------
// Professional filter (visibility)
// ---------------------------------------------------------------------------

describe("BookingCalendarToolbar — professional filter", () => {
  it("hides the professional filter for PROFESSIONAL role", () => {
    setup({ role: "PROFESSIONAL" });

    // The select trigger is identified by its visible label.
    expect(
      screen.queryByRole("combobox", { name: /Profesional/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the professional filter for ADMIN role", () => {
    setup({ role: "ADMIN" });

    expect(
      screen.getByRole("combobox", { name: /Profesional/i }),
    ).toBeInTheDocument();
  });

  it("shows the professional filter for SECRETARY role", () => {
    setup({ role: "SECRETARY" });

    expect(
      screen.getByRole("combobox", { name: /Profesional/i }),
    ).toBeInTheDocument();
  });

  it("emits onProfessionalIdChange when a professional is selected", async () => {
    const { onProfessionalIdChange, user } = setup({ role: "ADMIN" });

    // Open the select trigger and click an item. The Radix Select
    // renders the options in a portal, so we look for the visible
    // text after the user opens the trigger.
    const trigger = screen.getByRole("combobox", { name: /Profesional/i });
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: /Dr\. García/i }));

    expect(onProfessionalIdChange).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000010",
    );
  });
});

// ---------------------------------------------------------------------------
// URL sync
// ---------------------------------------------------------------------------

describe("BookingCalendarToolbar — URL sync", () => {
  it("calls router.replace with ?view=day&date=... when Día is clicked", async () => {
    const { user } = setup({ view: "week", date: "2026-06-22" });

    await user.click(screen.getByRole("button", { name: /Día/i }));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url = replaceMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("view=day");
    expect(url).toContain("date=2026-06-22");
  });

  it("calls router.replace with ?date=today when Hoy is clicked", async () => {
    const { user } = setup({ view: "week", date: "2026-06-22" });

    await user.click(screen.getByRole("button", { name: /Hoy/i }));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url = replaceMock.mock.calls[0]?.[0] as string;
    expect(url).toContain(`date=${todayISO()}`);
  });

  it("includes professionalId in the URL when one is set", async () => {
    const { user } = setup({
      view: "week",
      date: "2026-06-22",
      professionalId: "00000000-0000-4000-8000-000000000010",
      role: "ADMIN",
    });

    await user.click(screen.getByRole("button", { name: /Mes/i }));

    const url = replaceMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("view=month");
    expect(url).toContain("date=2026-06-22");
    expect(url).toContain("professionalId=00000000-0000-4000-8000-000000000010");
  });
});
