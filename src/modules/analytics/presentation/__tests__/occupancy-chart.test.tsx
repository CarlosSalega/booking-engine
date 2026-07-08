/**
 * Tests for OccupancyChart — BarChart showing occupancy rate.
 *
 * Verifies chart renders with data, shows Spanish labels, displays
 * the occupancy percentage, and handles empty data gracefully.
 *
 * Spec: ANP-006 (occupancy chart).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { OccupancyMetric } from "../../domain/types";

import { OccupancyChart } from "../occupancy-chart";

// ---------------------------------------------------------------------------
// Test fixtures — OccupancyMetric with known values.
// ---------------------------------------------------------------------------

const mockOccupancy: OccupancyMetric = {
  occupiedSlots: 12,
  totalSlots: 40,
  rate: 0.3,
};

const emptyOccupancy: OccupancyMetric = {
  occupiedSlots: 0,
  totalSlots: 0,
  rate: 0,
};

// ---------------------------------------------------------------------------
// OccupancyChart
// ---------------------------------------------------------------------------

describe("OccupancyChart", () => {
  it("renders the chart card with Spanish title", () => {
    render(<OccupancyChart data={mockOccupancy} />);

    expect(screen.getByText("Tasa de ocupación")).toBeInTheDocument();
  });

  it("renders chart description in Spanish", () => {
    render(<OccupancyChart data={mockOccupancy} />);

    expect(screen.getByText(/Porcentaje de turnos ocupados/i)).toBeInTheDocument();
  });

  it("renders occupancy percentage", () => {
    render(<OccupancyChart data={mockOccupancy} />);

    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders slot details", () => {
    render(<OccupancyChart data={mockOccupancy} />);

    expect(screen.getByText(/12.*40/)).toBeInTheDocument();
  });

  it("renders empty state when rate is zero and no slots", () => {
    render(<OccupancyChart data={emptyOccupancy} />);

    expect(screen.getByText(/No hay datos de ocupación/i)).toBeInTheDocument();
  });

  it("renders chart when totalSlots is non-zero even if rate is zero", () => {
    const zeroRate: OccupancyMetric = {
      occupiedSlots: 0,
      totalSlots: 40,
      rate: 0,
    };

    render(<OccupancyChart data={zeroRate} />);

    // Should show 0% not empty state
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText(/No hay datos/i)).not.toBeInTheDocument();
  });
});
