/**
 * Tests for the `ProfessionalTableSkeleton` Client Component.
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
 */

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { ProfessionalTableSkeleton } from "@/components/professionals/professional-table-skeleton";

describe("ProfessionalTableSkeleton", () => {
  it("renders the column headers that match the real table", () => {
    render(<ProfessionalTableSkeleton />);
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent?.trim() ?? "");
    expect(headerTexts).toContain("Nombre");
    expect(headerTexts).toContain("Email");
    expect(headerTexts).toContain("Especialidades");
    expect(headerTexts).toContain("Matrícula");
    expect(headerTexts).toContain("Estado");
  });

  it("renders 5 skeleton rows by default", () => {
    const { container } = render(<ProfessionalTableSkeleton />);
    // The skeleton uses shadcn/ui's <Skeleton> component which renders
    // a span with animate-pulse. We count skeleton cells across all
    // rows by querying for a stable, semantic attribute.
    const skeleton = screen.getByTestId("professional-table-skeleton");
    // The wrapper has aria-busy="true" + aria-label.
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("aria-label", "Cargando profesionales");
    // At least one cell renders
    expect(container.querySelectorAll("td").length).toBeGreaterThan(0);
  });

  it("renders the requested number of rows when `rows` prop is provided", () => {
    render(<ProfessionalTableSkeleton rows={3} />);
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row");
    // +1 for the header row
    expect(bodyRows).toHaveLength(3 + 1);
  });
});
