/**
 * Tests for the `ProfessionalTable` Client Component.
 *
 * Mirrors the `ServiceTable` and `PatientTable` test strategies:
 * render the component with a small mock array and assert the
 * rendered cells + the row links. The component is pure (no
 * fetching, no auth), so we can render it directly without mocks.
 * We DO mock `next/navigation` because the table uses `useRouter`
 * for pagination and row click navigation.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-list` — "List renders professionals with search and status filter"
 * - `professionals-list` — "Empty state when zero results"
 * - `professionals-list` — Columns: Nombre, Email, Especialidades, Matrícula, Estado.
 * - `professionals-list` — Status badge: Activo (emerald), Inactivo (gray).
 * - `professionals-list` — Each row links to /dashboard/professionals/[id].
 * - `professionals-list` — Pagination: Anterior / Siguiente buttons when totalPages > 1.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { ProfessionalStatus } from "@/modules/professionals/domain/professional";
import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";

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

import { ProfessionalTable } from "@/components/professionals/professional-table";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProfessional(
  overrides: Partial<EnrichedProfessional> = {},
): EnrichedProfessional {
  return {
    id: "p-1",
    organizationId: "org-1",
    userId: "u-1",
    fullName: "Dr. García",
    email: "garcia@test.com",
    image: undefined,
    specialties: ["Dermatología", "Cirugía"],
    license: "MN-12345",
    bio: undefined,
    status: ProfessionalStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("ProfessionalTable — empty state", () => {
  it("shows the empty state when the professionals array is empty", () => {
    render(
      <ProfessionalTable
        professionals={[]}
        total={0}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getByTestId("professional-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No hay profesionales")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Renders professionals with all expected columns
// ---------------------------------------------------------------------------

describe("ProfessionalTable — renders professionals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Nombre column with each professional's full name", () => {
    const professionals = [
      makeProfessional({ id: "p-1", fullName: "Dr. García" }),
      makeProfessional({ id: "p-2", fullName: "Dra. López" }),
    ];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={2}
        page={1}
        pageSize={20}
      />,
    );
    // Both desktop table AND mobile card stack render the name, so
    // we use getAllByText.
    expect(screen.getAllByText("Dr. García").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dra. López").length).toBeGreaterThan(0);
  });

  it("renders the Email column with each professional's email", () => {
    const professionals = [
      makeProfessional({ id: "p-1", email: "garcia@test.com" }),
      makeProfessional({ id: "p-2", email: "lopez@test.com" }),
    ];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={2}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("garcia@test.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("lopez@test.com").length).toBeGreaterThan(0);
  });

  it("renders the Especialidades column with the formatted specialty list", () => {
    const professionals = [
      makeProfessional({ specialties: ["Dermatología", "Cirugía"] }),
    ];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(
      screen.getAllByText("Dermatología, Cirugía").length,
    ).toBeGreaterThan(0);
  });

  it("renders the Matrícula column with the license string", () => {
    const professionals = [makeProfessional({ license: "MN-12345" })];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("MN-12345").length).toBeGreaterThan(0);
  });

  it("renders the Estado column with the 'Activo' badge for ACTIVE professionals", () => {
    const professionals = [makeProfessional({ status: ProfessionalStatus.ACTIVE })];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Activo").length).toBeGreaterThan(0);
  });

  it("renders the Estado column with the 'Inactivo' badge for INACTIVE professionals", () => {
    const professionals = [
      makeProfessional({ status: ProfessionalStatus.INACTIVE }),
    ];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(screen.getAllByText("Inactivo").length).toBeGreaterThan(0);
  });

  it("renders the em-dash placeholder when the license is undefined", () => {
    const professionals = [makeProfessional({ license: undefined })];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    // License column shows "—" for nullish values.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Row links
// ---------------------------------------------------------------------------

describe("ProfessionalTable — row links", () => {
  it("renders a link to /dashboard/professionals/[id] for each professional", () => {
    const professionals = [
      makeProfessional({ id: "p-1", fullName: "Dr. García" }),
      makeProfessional({ id: "p-2", fullName: "Dra. López" }),
    ];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={2}
        page={1}
        pageSize={20}
      />,
    );
    const link1 = screen.getAllByRole("link", { name: "Dr. García" })[0];
    expect(link1).toHaveAttribute("href", "/dashboard/professionals/p-1");
    const link2 = screen.getAllByRole("link", { name: "Dra. López" })[0];
    expect(link2).toHaveAttribute("href", "/dashboard/professionals/p-2");
  });

  it("renders the row as role=link with an aria-label for accessibility", () => {
    const professionals = [makeProfessional({ fullName: "Dr. García" })];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    expect(
      screen.getByRole("link", { name: /ver detalle de dr\. garcía/i }),
    ).toBeInTheDocument();
  });

  it("renders the column headers: Nombre, Email, Especialidades, Matrícula, Estado", () => {
    const professionals = [makeProfessional()];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent?.trim() ?? "");
    expect(headerTexts).toContain("Nombre");
    expect(headerTexts).toContain("Email");
    expect(headerTexts).toContain("Especialidades");
    expect(headerTexts).toContain("Matrícula");
    expect(headerTexts).toContain("Estado");
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("ProfessionalTable — pagination", () => {
  it("does not render pagination when total <= pageSize (single page)", () => {
    const professionals = [makeProfessional()];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={1}
        page={1}
        pageSize={20}
      />,
    );
    // No "Anterior" / "Siguiente" buttons rendered.
    expect(
      screen.queryByRole("link", { name: /anterior/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /siguiente/i }),
    ).not.toBeInTheDocument();
  });

  it("renders Anterior / Siguiente pagination when total > pageSize", () => {
    const professionals = Array.from({ length: 5 }, (_, i) =>
      makeProfessional({ id: `p-${i + 1}` }),
    );
    render(
      <ProfessionalTable
        professionals={professionals}
        total={45}
        page={2}
        pageSize={20}
      />,
    );
    // totalPages = ceil(45 / 20) = 3
    // Page 2 → both buttons visible
    expect(
      screen.getByRole("link", { name: /anterior/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /siguiente/i }),
    ).toBeInTheDocument();
  });

  it("shows the current page + total pages + total count in the pagination label", () => {
    const professionals = [makeProfessional()];
    render(
      <ProfessionalTable
        professionals={professionals}
        total={45}
        page={2}
        pageSize={20}
      />,
    );
    expect(screen.getByText(/página 2 de 3/i)).toBeInTheDocument();
    expect(screen.getByText(/45 profesionales/i)).toBeInTheDocument();
  });
});
