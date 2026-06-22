/**
 * Tests for the `ServiceTable` Client Component.
 *
 * Mirrors the patients `PatientTable` and bookings `BookingTable`
 * test strategies: render the component with a small mock array
 * and assert the rendered cells + the row links. The component
 * is pure (no fetching, no auth), so we can render it directly
 * without mocks. We DO mock `next/navigation` because the table
 * uses `useRouter` for pagination and row click navigation.
 *
 * Spec scenarios covered (from
 * `openspec/changes/services/specs/services-domain/spec.md`):
 * - `services-list` — "List renders services with search + status filter"
 * - `services-list` — "Empty state when zero results"
 * - `services-list` — Columns: Nombre, Profesional, Precio, Estado
 * - `services-list` — Each row links to /dashboard/services/[id]
 *
 * Note: the user-facing columns also include "Tipo de pago" per
 * the PR #3 prompt; we test it as well.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PaymentType, ServiceStatus } from "@/modules/services/domain/service";
import type { EnrichedService } from "@/modules/services/data/service-data.types";

// Mock next/navigation BEFORE importing the component. We don't care
// about which URLs are pushed during the tests — the table's
// row-navigation is verified by the rendered link element, not by
// observing router side-effects.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ServiceTable } from "@/components/services/service-table";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeService(overrides: Partial<EnrichedService> = {}): EnrichedService {
  return {
    id: "s-1",
    organizationId: "org-1",
    name: "Consulta General",
    description: "Una consulta estándar",
    durationMinutes: 30,
    price: { amount: 2000, currency: "ARS" },
    depositAmount: undefined,
    paymentType: PaymentType.FULL,
    status: ServiceStatus.ACTIVE,
    professionalId: "p-1",
    professionalName: "Dr. García",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("ServiceTable — empty state", () => {
  it("shows the empty state when the services array is empty", () => {
    render(
      <ServiceTable services={[]} total={0} page={1} pageSize={20} />,
    );
    expect(screen.getByTestId("service-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No hay servicios")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Renders services with all expected columns
// ---------------------------------------------------------------------------

describe("ServiceTable — renders services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Nombre column with each service name", () => {
    const services = [
      makeService({ id: "s-1", name: "Consulta General" }),
      makeService({ id: "s-2", name: "Limpieza Dental" }),
    ];
    render(
      <ServiceTable
        services={services}
        total={2}
        page={1}
        pageSize={20}
      />,
    );
    // Both desktop table AND mobile card stack render the name, so
    // we use getAllByText. The test asserts the value reaches the
    // DOM in at least one place.
    expect(screen.getAllByText("Consulta General").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Limpieza Dental").length).toBeGreaterThan(0);
  });

  it("renders the Profesional column with the professional name", () => {
    const services = [makeService({ professionalName: "Dr. García" })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Dr. García").length).toBeGreaterThan(0);
  });

  it("renders the Precio column with the formatted price (es-AR)", () => {
    const services = [
      makeService({ price: { amount: 2000, currency: "ARS" } }),
    ];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    // Intl es-AR ARS yields "$ 2.000,00" or "$\u00A02.000,00".
    // The thousands separator "2.000" is the stable part of the
    // output across ICU variants.
    expect(screen.getAllByText(/2\.000/).length).toBeGreaterThan(0);
  });

  it("renders the 'Tipo de pago' column with the Spanish payment-type label", () => {
    const services = [makeService({ paymentType: PaymentType.FULL })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Pago completo").length).toBeGreaterThan(0);
  });

  it("renders the 'Estado' column with the ServiceStatusBadge ('Activo')", () => {
    const services = [makeService({ status: ServiceStatus.ACTIVE })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Activo").length).toBeGreaterThan(0);
  });

  it("renders the 'Estado' column with 'Inactivo' for INACTIVE services", () => {
    const services = [makeService({ status: ServiceStatus.INACTIVE })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Inactivo").length).toBeGreaterThan(0);
  });

  it("renders the 'Sin costo' label for NONE payment-type services", () => {
    const services = [makeService({ paymentType: PaymentType.NONE })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Sin costo").length).toBeGreaterThan(0);
  });

  it("renders the 'Seña' label for DEPOSIT payment-type services", () => {
    const services = [makeService({ paymentType: PaymentType.DEPOSIT })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Seña").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Row links
// ---------------------------------------------------------------------------

describe("ServiceTable — row links", () => {
  it("renders a link to /dashboard/services/[id] for each service", () => {
    const services = [
      makeService({ id: "s-1", name: "Consulta General" }),
      makeService({ id: "s-2", name: "Limpieza Dental" }),
    ];
    render(
      <ServiceTable
        services={services}
        total={2}
        page={1}
        pageSize={20}
      />,
    );

    // The link is on the service name cell. The row itself also has
    // role="link" with an aria-label, but only the inner <a> has
    // the href. We look for the actual anchor elements.
    const links = screen.getAllByRole("link", { name: "Consulta General" });
    expect(links[0]).toHaveAttribute("href", "/dashboard/services/s-1");

    const links2 = screen.getAllByRole("link", { name: "Limpieza Dental" });
    expect(links2[0]).toHaveAttribute("href", "/dashboard/services/s-2");
  });

  it("renders the row as role=link with an aria-label for accessibility", () => {
    const services = [makeService({ id: "s-1", name: "Consulta General" })];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    // The row itself is keyboard-activatable; it carries
    // role="link" + aria-label so AT users can navigate to it.
    expect(
      screen.getByRole("link", { name: /ver detalle de consulta general/i }),
    ).toBeInTheDocument();
  });

  it("renders the column headers: Nombre, Profesional, Precio, Tipo de pago, Estado", () => {
    const services = [makeService()];
    render(
      <ServiceTable
        services={services}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    // Headers are scoped to the <thead> for clarity.
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent?.trim() ?? "");
    expect(headerTexts).toContain("Nombre");
    expect(headerTexts).toContain("Profesional");
    expect(headerTexts).toContain("Precio");
    expect(headerTexts).toContain("Tipo de pago");
    expect(headerTexts).toContain("Estado");
  });
});
