/**
 * Tests for `BookingCalendarEmpty` — the empty state shown when no
 * bookings match the visible range.
 *
 * The component renders:
 *
 * 1. A view-aware message — "No hay turnos esta semana" / "este día"
 *    / "este mes" — derived from the `view` prop.
 * 2. A "Nuevo turno" CTA that links to `/dashboard/bookings/new`
 *    and is HIDDEN for PROFESSIONAL viewers (they can also create
 *    bookings, but the spec keeps the CTA on the operator surface
 *    only — admins/secretaries are the primary bookers).
 *
 * The empty state is purely presentational. The page (Server
 * Component) decides whether to render it based on the bookings
 * array length; this component just renders the visual.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { UserRoleType } from "@/modules/auth/domain/roles";

import { BookingCalendarEmpty } from "../booking-calendar-empty";

interface EmptyProps {
  view?: "week" | "day" | "month";
  role?: UserRoleType;
}

function setup({ view = "week", role = "ADMIN" }: EmptyProps = {}) {
  return render(<BookingCalendarEmpty view={view} role={role} />);
}

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// View-aware message
// ---------------------------------------------------------------------------

describe("BookingCalendarEmpty — view-aware message", () => {
  it("renders 'No hay turnos esta semana' for week view", () => {
    setup({ view: "week" });
    expect(
      screen.getByText(/No hay turnos esta semana/i),
    ).toBeInTheDocument();
  });

  it("renders 'No hay turnos este día' for day view", () => {
    setup({ view: "day" });
    expect(screen.getByText(/No hay turnos este d/i)).toBeInTheDocument();
  });

  it("renders 'No hay turnos este mes' for month view", () => {
    setup({ view: "month" });
    expect(screen.getByText(/No hay turnos este mes/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "Nuevo turno" CTA
// ---------------------------------------------------------------------------

describe("BookingCalendarEmpty — Nuevo turno CTA", () => {
  it("links to /dashboard/bookings/new for ADMIN", () => {
    setup({ role: "ADMIN" });
    const link = screen.getByRole("link", { name: /Nuevo turno/i });
    expect(link).toHaveAttribute("href", "/dashboard/bookings/new");
  });

  it("links to /dashboard/bookings/new for SECRETARY", () => {
    setup({ role: "SECRETARY" });
    const link = screen.getByRole("link", { name: /Nuevo turno/i });
    expect(link).toHaveAttribute("href", "/dashboard/bookings/new");
  });

  it("does NOT render the CTA for PROFESSIONAL", () => {
    setup({ role: "PROFESSIONAL" });
    expect(
      screen.queryByRole("link", { name: /Nuevo turno/i }),
    ).not.toBeInTheDocument();
  });
});
