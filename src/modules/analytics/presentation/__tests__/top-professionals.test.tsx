/**
 * Tests for TopProfessionals — ranked professional list component.
 *
 * Verifies list renders with professional names, counts, revenue,
 * occupancy percentage, handles empty state, and limits to 5 items.
 *
 * Spec: ANP-007 (top professionals list), ANP-008 (filter visibility).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProfessionalMetric } from "../../domain/types";

import { TopProfessionals } from "../top-professionals";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockProfessionals: ProfessionalMetric[] = [
  { professionalUserId: "p1", name: "Dra. García", count: 50, revenue: 350000, occupancyRate: 0.85 },
  { professionalUserId: "p2", name: "Dr. López", count: 42, revenue: 294000, occupancyRate: 0.72 },
  { professionalUserId: "p3", name: "Dra. Martínez", count: 35, revenue: 245000, occupancyRate: 0.6 },
  { professionalUserId: "p4", name: "Dr. Rodríguez", count: 28, revenue: 196000, occupancyRate: 0.48 },
  { professionalUserId: "p5", name: "Dra. Fernández", count: 20, revenue: 140000, occupancyRate: 0.35 },
];

const sixProfessionals: ProfessionalMetric[] = [
  ...mockProfessionals,
  { professionalUserId: "p6", name: "Dr. Pérez", count: 15, revenue: 105000, occupancyRate: 0.25 },
];

// ---------------------------------------------------------------------------
// TopProfessionals
// ---------------------------------------------------------------------------

describe("TopProfessionals", () => {
  it("renders the section title in Spanish", () => {
    render(<TopProfessionals data={mockProfessionals} />);

    expect(screen.getByText("Profesionales más activos")).toBeInTheDocument();
  });

  it("renders professional names in order", () => {
    render(<TopProfessionals data={mockProfessionals} />);

    const items = screen.getAllByTestId(/^top-professional-/);
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("Dra. García");
    expect(items[1]).toHaveTextContent("Dr. López");
  });

  it("renders booking count for each professional", () => {
    render(<TopProfessionals data={mockProfessionals} />);

    expect(screen.getByText("50 reservas")).toBeInTheDocument();
    expect(screen.getByText("42 reservas")).toBeInTheDocument();
  });

  it("renders formatted revenue for each professional", () => {
    render(<TopProfessionals data={mockProfessionals} />);

    expect(screen.getByText(/\$?\s*350\.000/)).toBeInTheDocument();
  });

  it("renders occupancy percentage for each professional", () => {
    render(<TopProfessionals data={mockProfessionals} />);

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("limits to 5 items even when more are provided", () => {
    render(<TopProfessionals data={sixProfessionals} />);

    const items = screen.getAllByTestId(/^top-professional-/);
    expect(items).toHaveLength(5);
    expect(screen.queryByText("Dr. Pérez")).not.toBeInTheDocument();
  });

  it("renders empty state when no professionals", () => {
    render(<TopProfessionals data={[]} />);

    expect(screen.getByText(/No hay profesionales con actividad en este período/i)).toBeInTheDocument();
  });

  it("renders rank numbers (1-based)", () => {
    render(<TopProfessionals data={mockProfessionals} />);

    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("5.")).toBeInTheDocument();
  });
});
