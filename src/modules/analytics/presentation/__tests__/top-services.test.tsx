/**
 * Tests for TopServices — ranked service list component.
 *
 * Verifies list renders with service names, counts, revenue,
 * handles empty state, and limits to 5 items.
 *
 * Spec: ANP-007 (top services list).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ServiceMetric } from "../../domain/types";

import { TopServices } from "../top-services";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockServices: ServiceMetric[] = [
  { serviceId: "s1", serviceName: "Consulta general", count: 45, revenue: 225000 },
  { serviceId: "s2", serviceName: "Limpieza dental", count: 32, revenue: 192000 },
  { serviceId: "s3", serviceName: "Radiografía", count: 18, revenue: 108000 },
  { serviceId: "s4", serviceName: "Ortodoncia", count: 12, revenue: 360000 },
  { serviceId: "s5", serviceName: "Blanqueamiento", count: 8, revenue: 120000 },
];

const sixServices: ServiceMetric[] = [
  ...mockServices,
  { serviceId: "s6", serviceName: "Extracción", count: 5, revenue: 50000 },
];

// ---------------------------------------------------------------------------
// TopServices
// ---------------------------------------------------------------------------

describe("TopServices", () => {
  it("renders the section title in Spanish", () => {
    render(<TopServices data={mockServices} />);

    expect(screen.getByText("Servicios más reservados")).toBeInTheDocument();
  });

  it("renders service names in order", () => {
    render(<TopServices data={mockServices} />);

    const items = screen.getAllByTestId(/^top-service-/);
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("Consulta general");
    expect(items[1]).toHaveTextContent("Limpieza dental");
  });

  it("renders booking count for each service", () => {
    render(<TopServices data={mockServices} />);

    expect(screen.getByText("45 reservas")).toBeInTheDocument();
    expect(screen.getByText("32 reservas")).toBeInTheDocument();
  });

  it("renders formatted revenue for each service", () => {
    render(<TopServices data={mockServices} />);

    // formatCurrency formats as ARS — check it contains the amount
    expect(screen.getByText(/\$?\s*225\.000/)).toBeInTheDocument();
  });

  it("limits to 5 items even when more are provided", () => {
    render(<TopServices data={sixServices} />);

    const items = screen.getAllByTestId(/^top-service-/);
    expect(items).toHaveLength(5);
    expect(screen.queryByText("Extracción")).not.toBeInTheDocument();
  });

  it("renders empty state when no services", () => {
    render(<TopServices data={[]} />);

    expect(screen.getByText(/No hay servicios con reservas en este período/i)).toBeInTheDocument();
  });

  it("renders rank numbers (1-based)", () => {
    render(<TopServices data={mockServices} />);

    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("5.")).toBeInTheDocument();
  });
});
