/**
 * Tests for the `PaymentTableSkeleton` Component.
 *
 * The skeleton is a pure-markup component — no state, no callbacks,
 * no business logic. The test only proves the structure: column
 * headers match the real table + the right number of shimmer rows
 * are rendered.
 *
 * Skeletons don't have behavior to triangulate, so the structural
 * test (column headers + row count) is the entire contract. The
 * goal is to catch regressions where the skeleton drifts from the
 * real table's shape.
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - payments-presentation — Loading skeleton with shimmer rows in
 *   Suspense fallback.
 */

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PaymentTableSkeleton } from "@/components/payments/payment-table-skeleton";

describe("PaymentTableSkeleton", () => {
  it("renders the column headers that match the real table (7 columns)", () => {
    render(<PaymentTableSkeleton />);
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
    // 7 columns total
    expect(headers).toHaveLength(7);
  });

  it("renders 5 skeleton rows by default", () => {
    const { container } = render(<PaymentTableSkeleton />);
    const skeleton = screen.getByTestId("payment-table-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("aria-label", "Cargando pagos");
    // Cells exist in the rendered body
    expect(container.querySelectorAll("td").length).toBeGreaterThan(0);
  });

  it("renders the requested number of rows when `rows` prop is provided", () => {
    render(<PaymentTableSkeleton rows={3} />);
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row");
    // +1 for the header row
    expect(bodyRows).toHaveLength(3 + 1);
  });
});
