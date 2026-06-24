/**
 * `BookingCalendarToolbar` — the URL-driven control bar above the
 * calendar grid.
 *
 * Three controls:
 *
 * 1. **View toggle** (Semana / Día / Mes) — buttons that emit
 *    `onViewChange(view)` so the parent can update the URL and
 *    Schedule-X's `defaultView`.
 * 2. **"Hoy" button** — emits `onDateChange(today)` (formatted as
 *    `YYYY-MM-DD`) so the parent navigates back to the current
 *    week/day/month.
 * 3. **Professional filter** — a shadcn `Select` populated with the
 *    active professionals of the org. HIDDEN for PROFESSIONAL
 *    viewers (their calendar is scoped server-side to their own
 *    user id; the filter would be a no-op). For ADMIN / SECRETARY
 *    it emits `onProfessionalIdChange(id)`.
 *
 * URL sync: the toolbar mirrors the current state to the URL via
 * `router.replace(?view=...&date=...&professionalId=...)`. The
 * `replace` (not `push`) keeps the back-button history clean —
 * intermediate toolbar clicks do not pollute the history stack.
 *
 * The toolbar is intentionally a pure *controlled* component — the
 * parent owns the state and reads the URL; the toolbar just emits
 * the deltas. That makes it easy to test and lets the parent
 * synchronize with `useSearchParams`.
 */

"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import type { ProfessionalOption } from "@/modules/bookings/data/booking-data.types";
import type { UserRoleType } from "@/modules/auth/domain/roles";
import { USER_ROLE } from "@/modules/auth/domain/roles";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useMediaQuery } from "@/hooks/use-media-query";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CalendarView = "week" | "day" | "month";

interface BookingCalendarToolbarProps {
  view: CalendarView;
  /** Current visible date in `YYYY-MM-DD` format. */
  date: string;
  /** Active professional id (uuid) or undefined for "Todos". */
  professionalId?: string;
  /** Current viewer role — gates the professional filter. */
  role: UserRoleType;
  /** Active professionals to populate the filter (admin/secretary only). */
  professionals: ProfessionalOption[];
  /**
   * Optional callbacks. The toolbar handles URL sync via
   * `router.replace` regardless — these are for the rare case where
   * a parent wants to react to the change (e.g. for analytics or
   * to drive a parallel URL state). When omitted, the toolbar
   * silently does its URL update.
   */
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: string) => void;
  onProfessionalIdChange?: (professionalId: string | undefined) => void;
}

const ALL_PROFESSIONALS = "__all__";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingCalendarToolbar({
  view,
  date,
  professionalId,
  role,
  professionals,
  onViewChange,
  onDateChange,
  onProfessionalIdChange,
}: BookingCalendarToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMobile = useMediaQuery("(max-width: 768px)");

  // URL sync helper — every interactive element rebuilds the URL
  // from the current `searchParams` and calls `router.replace`.
  // `replace` keeps the back-button stack clean (intermediate
  // toolbar clicks are not history entries).
  const updateUrl = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const handleViewChange = useCallback(
    (next: CalendarView) => {
      onViewChange?.(next);
      updateUrl((params) => {
        // The URL is the source of truth for the calendar state
        // (AD3 in design.md). We always write the FULL state so
        // bookmarked / shared links reflect the entire snapshot,
        // not just the last field that changed.
        params.set("view", next);
        params.set("date", date);
        if (professionalId) {
          params.set("professionalId", professionalId);
        } else {
          params.delete("professionalId");
        }
      });
    },
    [onViewChange, updateUrl, date, professionalId],
  );

  const handleHoy = useCallback(() => {
    const today = todayISO();
    onDateChange?.(today);
    updateUrl((params) => {
      params.set("date", today);
      params.set("view", view);
      if (professionalId) {
        params.set("professionalId", professionalId);
      } else {
        params.delete("professionalId");
      }
    });
  }, [onDateChange, updateUrl, view, professionalId]);

  // Shift the visible date by ±1 day. On mobile, this is the primary
  // way to navigate (the Schedule-X header arrows are too small to
  // reliably tap). The toolbar preserves the current view — switching
  // views is done through the view-toggle buttons.
  const shiftDate = useCallback(
    (deltaDays: number) => {
      const next = Temporal.PlainDate.from(date)
        .add({ days: deltaDays })
        .toString();
      onDateChange?.(next);
      updateUrl((params) => {
        params.set("date", next);
        params.set("view", view);
        if (professionalId) {
          params.set("professionalId", professionalId);
        } else {
          params.delete("professionalId");
        }
      });
    },
    [onDateChange, updateUrl, view, date, professionalId],
  );

  const handleProfessionalChange = useCallback(
    (value: string) => {
      const next = value === ALL_PROFESSIONALS ? undefined : value;
      onProfessionalIdChange?.(next);
      updateUrl((params) => {
        if (next) {
          params.set("professionalId", next);
        } else {
          params.delete("professionalId");
        }
        params.set("view", view);
        params.set("date", date);
      });
    },
    [onProfessionalIdChange, updateUrl, view, date],
  );

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="booking-calendar-toolbar"
    >
      {/* View toggle */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Vista del calendario"
      >
        <Button
          type="button"
          variant={view === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => handleViewChange("week")}
          data-view="week"
          data-testid="toolbar-view-week"
        >
          Semana
        </Button>
        <Button
          type="button"
          variant={view === "day" ? "default" : "outline"}
          size="sm"
          onClick={() => handleViewChange("day")}
          data-view="day"
          data-testid="toolbar-view-day"
        >
          Día
        </Button>
        <Button
          type="button"
          variant={view === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => handleViewChange("month")}
          data-view="month"
          data-testid="toolbar-view-month"
        >
          Mes
        </Button>
      </div>

      {/* Date — display only, navigation goes through Hoy / prev / next (mobile only) */}
      <div
        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
        data-testid="toolbar-current-date"
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        <span className="font-mono tabular-nums">{date}</span>
      </div>

      {/* "Hoy" button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleHoy}
        data-testid="toolbar-today"
      >
        Hoy
      </Button>

      {/* Optional prev/next arrows on mobile (when the calendar is too
         narrow for Schedule-X's built-in header) */}
      {isMobile ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Día anterior"
            data-testid="toolbar-prev"
            onClick={() => shiftDate(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Día siguiente"
            data-testid="toolbar-next"
            onClick={() => shiftDate(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}

      {/* Professional filter — hidden for PROFESSIONAL role */}
      {role !== USER_ROLE.PROFESSIONAL ? (
        <Select
          value={professionalId ?? ALL_PROFESSIONALS}
          onValueChange={handleProfessionalChange}
        >
          <SelectTrigger
            className="w-[180px]"
            data-testid="toolbar-professional-trigger"
            aria-label="Profesional"
          >
            <SelectValue placeholder="Todos los profesionales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROFESSIONALS}>
              Todos los profesionales
            </SelectItem>
            {professionals.map((prof) => (
              <SelectItem key={prof.id} value={prof.id}>
                {prof.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
