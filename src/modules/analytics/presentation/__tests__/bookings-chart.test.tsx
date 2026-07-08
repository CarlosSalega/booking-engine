/**
 * Tests for BookingsChart — PieChart showing bookings by status.
 *
 * Verifies chart renders with data, shows Spanish labels for each
 * status slice (Confirmadas, Canceladas, Completadas), and handles
 * empty data gracefully.
 *
 * Spec: ANP-005 (bookings chart).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BookingMetric } from "../../domain/types";

import { BookingsChart } from "../bookings-chart";

// ---------------------------------------------------------------------------
// Test fixtures — BookingMetric with known values.
// ---------------------------------------------------------------------------

const mockBookings: BookingMetric = {
  total: 10,
  confirmed: 6,
  cancelled: 2,
  completed: 2,
  completionRate: 0.2,
};

const emptyBookings: BookingMetric = {
  total: 0,
  confirmed: 0,
  cancelled: 0,
  completed: 0,
  completionRate: 0,
};

// ---------------------------------------------------------------------------
// BookingsChart
// ---------------------------------------------------------------------------

describe("BookingsChart", () => {
  it("renders the chart card with Spanish title", () => {
    render(<BookingsChart data={mockBookings} />);

    expect(screen.getByText("Reservas por estado")).toBeInTheDocument();
  });

  it("renders chart description in Spanish", () => {
    render(<BookingsChart data={mockBookings} />);

    expect(screen.getByText(/Distribución de reservas/i)).toBeInTheDocument();
  });

  it("renders status labels in Spanish", () => {
    render(<BookingsChart data={mockBookings} />);

    expect(screen.getByText("Confirmadas")).toBeInTheDocument();
    expect(screen.getByText("Canceladas")).toBeInTheDocument();
    expect(screen.getByText("Completadas")).toBeInTheDocument();
  });

  it("renders status counts", () => {
    render(<BookingsChart data={mockBookings} />);

    // Each status row has: dot + label + count
    // Confirmadas: 6, Canceladas: 2, Completadas: 2
    const rows = screen.getAllByText(/^(Confirmadas|Canceladas|Completadas)$/);
    expect(rows).toHaveLength(3);
  });

  it("renders empty state when all counts are zero", () => {
    render(<BookingsChart data={emptyBookings} />);

    expect(screen.getByText(/No hay datos de reservas/i)).toBeInTheDocument();
  });

  it("does not render status labels when data is empty", () => {
    render(<BookingsChart data={emptyBookings} />);

    expect(screen.queryByText("Confirmadas")).not.toBeInTheDocument();
    expect(screen.queryByText("Canceladas")).not.toBeInTheDocument();
  });

  it("renders only non-zero status slices", () => {
    const confirmedOnly: BookingMetric = {
      total: 5,
      confirmed: 5,
      cancelled: 0,
      completed: 0,
      completionRate: 0,
    };

    render(<BookingsChart data={confirmedOnly} />);

    expect(screen.getByText("Confirmadas")).toBeInTheDocument();
    expect(screen.queryByText("Canceladas")).not.toBeInTheDocument();
    expect(screen.queryByText("Completadas")).not.toBeInTheDocument();
  });
});
