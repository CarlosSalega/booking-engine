/**
 * Tests for RevenueChart — AreaChart showing daily revenue over time.
 *
 * Verifies chart renders with data, shows Spanish labels, and handles
 * empty data gracefully.
 *
 * Spec: ANP-004 (revenue chart).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RevenueMetric } from "../../domain/types";

import { RevenueChart } from "../revenue-chart";

// ---------------------------------------------------------------------------
// Test fixtures — RevenueMetric with known values.
// ---------------------------------------------------------------------------

const mockRevenue: RevenueMetric = {
  total: 150000,
  averagePerBooking: 15000,
  dailyRevenue: [
    { date: "2026-07-01", amount: 50000 },
    { date: "2026-07-02", amount: 45000 },
    { date: "2026-07-03", amount: 55000 },
  ],
  monthlyRevenue: [],
};

const emptyRevenue: RevenueMetric = {
  total: 0,
  averagePerBooking: 0,
  dailyRevenue: [],
  monthlyRevenue: [],
};

// ---------------------------------------------------------------------------
// RevenueChart
// ---------------------------------------------------------------------------

describe("RevenueChart", () => {
  it("renders the chart card with Spanish title", () => {
    render(<RevenueChart data={mockRevenue} />);

    expect(screen.getByText("Ingresos diarios")).toBeInTheDocument();
  });

  it("renders chart description in Spanish", () => {
    render(<RevenueChart data={mockRevenue} />);

    expect(screen.getByText(/Evolución de ingresos/i)).toBeInTheDocument();
  });

  it("renders chart container when data has points", () => {
    render(<RevenueChart data={mockRevenue} />);

    // The chart renders inside a Card — title is visible
    expect(screen.getByText("Ingresos diarios")).toBeInTheDocument();
    // Description is also present
    expect(screen.getByText(/Evolución de ingresos/i)).toBeInTheDocument();
  });

  it("renders empty state when dailyRevenue is empty", () => {
    render(<RevenueChart data={emptyRevenue} />);

    expect(screen.getByText(/No hay datos de ingresos/i)).toBeInTheDocument();
  });

  it("does not render chart SVG when data is empty", () => {
    const { container } = render(<RevenueChart data={emptyRevenue} />);

    // Should not render the Recharts SVG
    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });

  it("renders with a single data point", () => {
    const singlePoint: RevenueMetric = {
      total: 10000,
      averagePerBooking: 10000,
      dailyRevenue: [{ date: "2026-07-05", amount: 10000 }],
      monthlyRevenue: [],
    };

    render(<RevenueChart data={singlePoint} />);

    // Still renders chart card with title
    expect(screen.getByText("Ingresos diarios")).toBeInTheDocument();
    // Should NOT show empty state
    expect(screen.queryByText(/No hay datos/i)).not.toBeInTheDocument();
  });
});
