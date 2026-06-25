/**
 * Tests for the `PaymentTable` Client Component.
 *
 * Mirrors the `ProfessionalTable` and `PatientTable` test
 * strategies: render the component with a small mock array and
 * assert the rendered cells + the row links. The component is
 * pure (no fetching, no auth), so we can render it directly
 * without mocks. We DO mock `next/navigation` because the table
 * uses `useRouter` for pagination and row click navigation.
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — 7 columns: "Fecha de reserva",
 *   "Paciente", "Profesional", "Servicio", "Monto", "Estado",
 *   "Acciones".
 * - payments-presentation — List renders payments with filters.
 * - payments-presentation — Empty state when zero results.
 * - payments-presentation — Each row links to
 *   /dashboard/payments/[id].
 * - payments-presentation — Pagination: Anterior / Siguiente
 *   buttons when totalPages > 1.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";
import type { EnrichedPayment } from "@/modules/payments/data/payment-data.types";

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

import { PaymentTable } from "@/components/payments/payment-table";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PAYMENT_ID_1 = "00000000-0000-4000-8000-0000000000c1";
const PAYMENT_ID_2 = "00000000-0000-4000-8000-0000000000c2";
const BOOKING_ID_1 = "00000000-0000-4000-8000-0000000000b1";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

function makePayment(
  overrides: Partial<EnrichedPayment> = {},
): EnrichedPayment {
  return {
    id: PAYMENT_ID_1,
    organizationId: ORG_ID,
    bookingId: BOOKING_ID_1,
    provider: "MERCADOPAGO",
    status: ProviderPaymentStatus.PENDING,
    amount: 5000,
    preferenceId: "pref-1",
    externalReference: "ext-1",
    retryCount: 0,
    parentPaymentId: undefined,
    createdAt: new Date("2026-06-20T10:00:00Z"),
    updatedAt: new Date("2026-06-20T10:00:00Z"),
    bookingStartTime: new Date("2026-06-25T14:00:00Z"),
    patientName: "María González",
    professionalName: "Dr. García",
    serviceName: "Consulta general",
    servicePaymentType: "FULL",
    businessStatus: "PENDING",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("PaymentTable — empty state", () => {
  it("shows the empty state when the payments array is empty", () => {
    render(
      <PaymentTable payments={[]} total={0} page={1} pageSize={20} />,
    );
    expect(screen.getByTestId("payment-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No hay pagos")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Renders payments with all expected columns
// ---------------------------------------------------------------------------

describe("PaymentTable — renders payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Paciente column with each payment's patient name", () => {
    const payments = [
      makePayment({ id: PAYMENT_ID_1, patientName: "María González" }),
      makePayment({ id: PAYMENT_ID_2, patientName: "Juan Pérez" }),
    ];
    render(
      <PaymentTable
        payments={payments}
        total={2}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("María González").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Juan Pérez").length).toBeGreaterThan(0);
  });

  it("renders the Profesional column with each payment's professional name", () => {
    const payments = [makePayment({ professionalName: "Dr. García" })];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Dr. García").length).toBeGreaterThan(0);
  });

  it("renders the Servicio column with each payment's service name", () => {
    const payments = [makePayment({ serviceName: "Consulta general" })];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Consulta general").length).toBeGreaterThan(0);
  });

  it("renders the Monto column with the formatted currency", () => {
    const payments = [makePayment({ amount: 5000 })];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    // formatCurrency(5000) → "$ 5.000,00"
    expect(screen.getAllByText(/\$ 5\.000,00/).length).toBeGreaterThan(0);
  });

  it("renders the Estado column with the 'Pendiente' badge for PENDING payments", () => {
    const payments = [
      makePayment({ status: ProviderPaymentStatus.PENDING }),
    ];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  });

  it("renders the Estado column with the 'Aprobado' badge for APPROVED payments", () => {
    const payments = [
      makePayment({ status: ProviderPaymentStatus.APPROVED }),
    ];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Aprobado").length).toBeGreaterThan(0);
  });

  it("renders all 5 status badges correctly", () => {
    const allStatuses: ProviderPaymentStatusType[] = [
      ProviderPaymentStatus.PENDING,
      ProviderPaymentStatus.APPROVED,
      ProviderPaymentStatus.REJECTED,
      ProviderPaymentStatus.CANCELLED,
      ProviderPaymentStatus.IN_PROCESS,
    ];
    const payments = allStatuses.map((status, i) =>
      makePayment({ id: `${PAYMENT_ID_1}-${i}`, status }),
    );
    render(
      <PaymentTable
        payments={payments}
        total={5}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aprobado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rechazado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En proceso").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Row links
// ---------------------------------------------------------------------------

describe("PaymentTable — row links", () => {
  it("renders a 'Ver detalle' link to /dashboard/payments/[id] in each row", () => {
    const payments = [
      makePayment({ id: PAYMENT_ID_1, patientName: "María González" }),
      makePayment({ id: PAYMENT_ID_2, patientName: "Juan Pérez" }),
    ];
    render(
      <PaymentTable
        payments={payments}
        total={2}
        page={1}
        pageSize={20}
      />,
    );
    // Each row has an inner <Link> "Ver detalle" pointing to the row's id.
    const detailLinks = screen.getAllByRole("link", { name: /ver detalle/i });
    expect(detailLinks.length).toBeGreaterThanOrEqual(2);
    // Both row hrefs are present in the rendered output
    const allHrefs = detailLinks.map((l) => l.getAttribute("href") ?? "");
    expect(allHrefs).toContain(`/dashboard/payments/${PAYMENT_ID_1}`);
    expect(allHrefs).toContain(`/dashboard/payments/${PAYMENT_ID_2}`);
  });

  it("renders the row as role=link with an aria-label for accessibility", () => {
    const payments = [makePayment({ patientName: "María González" })];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(
      screen.getByRole("link", { name: /ver detalle de maría gonzález/i }),
    ).toBeInTheDocument();
  });

  it("renders the 7 column headers: Fecha, Paciente, Profesional, Servicio, Monto, Estado, Acciones", () => {
    const payments = [makePayment()];
    render(
      <PaymentTable
        payments={payments}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent?.trim() ?? "");
    expect(headerTexts).toContain("Fecha");
    expect(headerTexts).toContain("Paciente");
    expect(headerTexts).toContain("Profesional");
    expect(headerTexts).toContain("Servicio");
    expect(headerTexts).toContain("Monto");
    expect(headerTexts).toContain("Estado");
    expect(headerTexts).toContain("Acciones");
    expect(headers).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("PaymentTable — pagination", () => {
  it("does not render pagination when total <= pageSize (single page)", () => {
    const payments = [makePayment()];
    render(
      <PaymentTable payments={payments} total={1} page={1} pageSize={20} />,
    );
    expect(
      screen.queryByRole("link", { name: /anterior/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /siguiente/i }),
    ).not.toBeInTheDocument();
  });

  it("renders Anterior / Siguiente pagination when total > pageSize", () => {
    const payments = Array.from({ length: 5 }, (_, i) =>
      makePayment({ id: `${PAYMENT_ID_1}-${i}` }),
    );
    render(
      <PaymentTable payments={payments} total={45} page={2} pageSize={20} />,
    );
    expect(
      screen.getByRole("link", { name: /anterior/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /siguiente/i }),
    ).toBeInTheDocument();
  });

  it("shows the current page + total pages + total count in the pagination label", () => {
    const payments = [makePayment()];
    render(
      <PaymentTable payments={payments} total={45} page={2} pageSize={20} />,
    );
    expect(screen.getByText(/página 2 de 3/i)).toBeInTheDocument();
    expect(screen.getByText(/45 pagos/i)).toBeInTheDocument();
  });
});
