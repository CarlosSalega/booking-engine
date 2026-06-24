/**
 * Tests for the `ProfessionalStatusBadge` Client Component.
 *
 * Mirrors the `ServiceStatusBadge` and `PatientStatusBadge` test
 * strategies: render the component with @testing-library/react and
 * assert the rendered label + the badge variant prop. The component
 * is small enough that we can render it directly without mocking —
 * no Next.js router, no auth, no Prisma.
 *
 * The test covers all 2 ProfessionalStatus values + the expected
 * variant map. The variant is exported as a constant so consumers
 * (e.g. the table, the detail card) can reference it directly.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-list` — Status badge: "Activo" (emerald), "Inactivo" (gray).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "@/modules/professionals/domain/professional";

import {
  ProfessionalStatusBadge,
  PROFESSIONAL_STATUS_BADGE_VARIANT,
} from "@/components/professionals/professional-status-badge";

// ---------------------------------------------------------------------------
// PROFESSIONAL_STATUS_BADGE_VARIANT — the variant map
// ---------------------------------------------------------------------------

describe("PROFESSIONAL_STATUS_BADGE_VARIANT", () => {
  it("maps ACTIVE → default (emerald tone)", () => {
    expect(PROFESSIONAL_STATUS_BADGE_VARIANT[ProfessionalStatus.ACTIVE]).toBe(
      "default",
    );
  });

  it("maps INACTIVE → secondary (gray tone)", () => {
    expect(PROFESSIONAL_STATUS_BADGE_VARIANT[ProfessionalStatus.INACTIVE]).toBe(
      "secondary",
    );
  });

  it("covers all 2 ProfessionalStatus values (exhaustive)", () => {
    const all: ProfessionalStatusType[] = [
      ProfessionalStatus.ACTIVE,
      ProfessionalStatus.INACTIVE,
    ];
    for (const status of all) {
      expect(PROFESSIONAL_STATUS_BADGE_VARIANT[status]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// ProfessionalStatusBadge — renders the correct label + variant
// ---------------------------------------------------------------------------

describe("ProfessionalStatusBadge", () => {
  it("renders the Spanish label 'Activo' for ACTIVE", () => {
    render(<ProfessionalStatusBadge status={ProfessionalStatus.ACTIVE} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Inactivo' for INACTIVE", () => {
    render(<ProfessionalStatusBadge status={ProfessionalStatus.INACTIVE} />);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("renders a default-variant badge for ACTIVE", () => {
    render(<ProfessionalStatusBadge status={ProfessionalStatus.ACTIVE} />);
    const badge = screen.getByText("Activo");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("renders a secondary-variant badge for INACTIVE", () => {
    render(<ProfessionalStatusBadge status={ProfessionalStatus.INACTIVE} />);
    const badge = screen.getByText("Inactivo");
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });
});
