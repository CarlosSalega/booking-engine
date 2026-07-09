/**
 * Tests for KPICards — 4 KPI cards for the analytics dashboard.
 *
 * Verifies formatted revenue (ARS), occupancy percentage, booking
 * count (total/confirmed/cancelled), and patient count (new/returning).
 *
 * Spec: ANP-003 (KPI cards).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AnalyticsResponse } from "../../domain/types";

import { KPICards } from "../kpi-cards";

// ---------------------------------------------------------------------------
// Test fixtures — minimal AnalyticsResponse with known values.
// ---------------------------------------------------------------------------

const mockData: AnalyticsResponse = {
  revenue: {
    total: 150000,
    averagePerBooking: 15000,
    dailyRevenue: [],
    monthlyRevenue: [],
  },
  bookings: {
    total: 10,
    confirmed: 6,
    cancelled: 2,
    completed: 2,
    completionRate: 0.2,
  },
  occupancy: {
    occupiedSlots: 12,
    totalSlots: 40,
    rate: 0.3,
  },
  patients: {
    newPatients: 5,
    returningPatients: 3,
    totalUnique: 8,
  },
  topServices: [],
  topProfessionals: [],
  peakHours: [],
  dayDistribution: [],
};

describe("KPICards", () => {
  it("renders revenue card with formatted ARS amount", () => {
    render(<KPICards data={mockData} />);

    // formatCurrency(150000) → "$ 150.000" (es-AR, space after symbol)
    expect(screen.getByText("Ingresos totales")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-revenue")).toHaveTextContent("$ 150.000");
  });

  it("renders bookings card with total count", () => {
    render(<KPICards data={mockData} />);

    expect(screen.getByText("Reservas")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-bookings")).toHaveTextContent("10");
  });

  it("renders occupancy card with percentage", () => {
    render(<KPICards data={mockData} />);

    expect(screen.getByText("Ocupación")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-occupancy")).toHaveTextContent("30%");
  });

  it("renders patients card with unique count", () => {
    render(<KPICards data={mockData} />);

    expect(screen.getByText("Pacientes")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-patients")).toHaveTextContent("8");
  });

  it("renders 4 KPI cards total", () => {
    render(<KPICards data={mockData} />);

    const cards = screen.getAllByTestId(/^kpi-/);
    expect(cards).toHaveLength(4);
  });
});
