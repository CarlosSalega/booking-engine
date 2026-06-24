/**
 * `BookingCalendarEmpty` — the empty state shown when no bookings
 * match the visible range.
 *
 * Renders:
 *
 * 1. A view-aware message in Argentinian Spanish
 *    (week → "esta semana", day → "este día", month → "este mes").
 * 2. A "Nuevo turno" CTA linking to `/dashboard/bookings/new` for
 *    ADMIN / SECRETARY (the operator surface). PROFESSIONAL viewers
 *    don't see the CTA — they still have access to the booking
 *    creation flow from the sidebar but the empty state is a hint
 *    for the operator who manages the schedule, not a creation
 *    prompt for the practitioner.
 *
 * Pure presentational: no fetching, no auth, no router mutation. The
 * parent (the calendar page) decides whether to render this
 * component based on the bookings array length; the component just
 * renders the visual.
 */

"use client";

import Link from "next/link";
import { CalendarX2, Plus } from "lucide-react";

import type { UserRoleType } from "@/modules/auth/domain/roles";
import { USER_ROLE } from "@/modules/auth/domain/roles";

import { Button } from "@/components/ui/button";

import type { CalendarView } from "./booking-calendar-toolbar";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

interface BookingCalendarEmptyProps {
  view: CalendarView;
  role: UserRoleType;
}

// ---------------------------------------------------------------------------
// View-aware copy
// ---------------------------------------------------------------------------

const EMPTY_COPY: Record<CalendarView, string> = {
  week: "No hay turnos esta semana",
  day: "No hay turnos este día",
  month: "No hay turnos este mes",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingCalendarEmpty({
  view,
  role,
}: BookingCalendarEmptyProps) {
  const showCta = role !== USER_ROLE.PROFESSIONAL;

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12 text-center"
      data-testid="booking-calendar-empty"
    >
      <CalendarX2 className="size-12 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{EMPTY_COPY[view]}</p>
        <p className="text-xs text-muted-foreground">
          Cuando agendes un turno aparecerá en esta vista.
        </p>
      </div>
      {showCta ? (
        <Button asChild size="sm" data-testid="booking-calendar-empty-cta">
          <Link href="/dashboard/bookings/new" className="gap-1.5">
            <Plus className="size-4" />
            Nuevo turno
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
