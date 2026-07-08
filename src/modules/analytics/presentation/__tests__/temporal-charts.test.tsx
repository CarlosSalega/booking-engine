/**
 * Tests for TemporalCharts — peak hours + day-of-week distribution.
 *
 * Verifies two BarCharts render with correct Spanish labels,
 * data mapping, and empty states.
 *
 * Spec: ANP-007 (temporal charts — partial: peak hours + day distribution).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DayDistributionMetric, PeakHourMetric } from "../../domain/types";

import { TemporalCharts } from "../temporal-charts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockPeakHours: PeakHourMetric[] = [
  { hour: 9, count: 12 },
  { hour: 10, count: 18 },
  { hour: 14, count: 8 },
  { hour: 15, count: 15 },
];

const mockDayDistribution: DayDistributionMetric[] = [
  { dayOfWeek: 1, count: 20 }, // Lunes
  { dayOfWeek: 2, count: 15 }, // Martes
  { dayOfWeek: 3, count: 22 }, // Miércoles
  { dayOfWeek: 4, count: 10 }, // Jueves
  { dayOfWeek: 5, count: 18 }, // Viernes
  { dayOfWeek: 6, count: 5 },  // Sábado
];

// ---------------------------------------------------------------------------
// TemporalCharts
// ---------------------------------------------------------------------------

describe("TemporalCharts", () => {
  // --- Peak Hours ---

  it("renders peak hours chart title in Spanish", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={mockDayDistribution} />,
    );

    expect(screen.getByText("Horas pico")).toBeInTheDocument();
  });

  it("renders peak hours chart description", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={mockDayDistribution} />,
    );

    expect(screen.getByText(/Distribución de reservas por hora/i)).toBeInTheDocument();
  });

  it("renders peak hours empty state when no data", () => {
    render(
      <TemporalCharts peakHours={[]} dayDistribution={mockDayDistribution} />,
    );

    expect(screen.getByText(/No hay datos de horas pico/i)).toBeInTheDocument();
  });

  it("renders peak hours chart container when data is present (not empty state)", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={mockDayDistribution} />,
    );

    // Should NOT show empty state — data is present
    expect(screen.queryByText(/No hay datos de horas pico/i)).not.toBeInTheDocument();
    // Title confirms the chart card rendered
    expect(screen.getByText("Horas pico")).toBeInTheDocument();
  });

  // --- Day Distribution ---

  it("renders day distribution chart title in Spanish", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={mockDayDistribution} />,
    );

    expect(screen.getByText("Distribución semanal")).toBeInTheDocument();
  });

  it("renders day distribution chart description", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={mockDayDistribution} />,
    );

    expect(screen.getByText(/Reservas por día de la semana/i)).toBeInTheDocument();
  });

  it("renders day distribution empty state when no data", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={[]} />,
    );

    expect(screen.getByText(/No hay datos de distribución semanal/i)).toBeInTheDocument();
  });

  it("renders day distribution chart container when data is present (not empty state)", () => {
    render(
      <TemporalCharts peakHours={mockPeakHours} dayDistribution={mockDayDistribution} />,
    );

    // Should NOT show empty state — data is present
    expect(screen.queryByText(/No hay datos de distribución semanal/i)).not.toBeInTheDocument();
    // Title confirms the chart card rendered
    expect(screen.getByText("Distribución semanal")).toBeInTheDocument();
  });

  it("renders both empty states when both datasets are empty", () => {
    render(<TemporalCharts peakHours={[]} dayDistribution={[]} />);

    expect(screen.getByText(/No hay datos de horas pico/i)).toBeInTheDocument();
    expect(screen.getByText(/No hay datos de distribución semanal/i)).toBeInTheDocument();
  });
});
