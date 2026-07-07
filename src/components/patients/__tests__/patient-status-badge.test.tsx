/**
 * Tests for the `PatientStatusBadge` Client Component.
 *
 * Mirrors the bookings `BookingStatusBadge` test strategy: render the
 * component with @testing-library/react and assert the rendered label.
 * The variant mapping is tested independently via the exported
 * PATIENT_STATUS_BADGE_VARIANT constant — we intentionally avoid
 * asserting internal DOM attributes like `data-variant` to keep tests
 * focused on user-visible behavior.
 *
 * The test covers all 3 PatientStatus values + a snapshot of the
 * expected variant map. The variant is exported as a constant so
 * consumers (e.g. the table) can reference it directly.
 *
 * Spec scenarios covered (from
 * `openspec/changes/patients/specs/patients-domain/spec.md`):
 * - patients-list — Status badges: Activo (green), Inactivo (gray),
 *   Bloqueado (red).
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PatientStatus, type PatientStatusType } from "@/modules/patients/domain/patient";

import {
  PATIENT_STATUS_BADGE_VARIANT,
  PatientStatusBadge,
} from "@/components/patients/patient-status-badge";

// ---------------------------------------------------------------------------
// PATIENT_STATUS_BADGE_VARIANT — the variant map
// ---------------------------------------------------------------------------

describe("PATIENT_STATUS_BADGE_VARIANT", () => {
  it("maps ACTIVE → default (green in app CSS)", () => {
    expect(PATIENT_STATUS_BADGE_VARIANT[PatientStatus.ACTIVE]).toBe("default");
  });

  it("maps INACTIVE → secondary (gray in app CSS)", () => {
    expect(PATIENT_STATUS_BADGE_VARIANT[PatientStatus.INACTIVE]).toBe(
      "secondary",
    );
  });

  it("maps BLOCKED → destructive (red in app CSS)", () => {
    expect(PATIENT_STATUS_BADGE_VARIANT[PatientStatus.BLOCKED]).toBe(
      "destructive",
    );
  });

  it("covers all 3 PatientStatus values (exhaustive)", () => {
    const all: PatientStatusType[] = [
      PatientStatus.ACTIVE,
      PatientStatus.INACTIVE,
      PatientStatus.BLOCKED,
    ];
    for (const status of all) {
      expect(PATIENT_STATUS_BADGE_VARIANT[status]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// PatientStatusBadge — renders the correct label
// ---------------------------------------------------------------------------

describe("PatientStatusBadge", () => {
  it("renders the Spanish label 'Activo' for ACTIVE", () => {
    render(<PatientStatusBadge status={PatientStatus.ACTIVE} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Inactivo' for INACTIVE", () => {
    render(<PatientStatusBadge status={PatientStatus.INACTIVE} />);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("renders the Spanish label 'Bloqueado' for BLOCKED", () => {
    render(<PatientStatusBadge status={PatientStatus.BLOCKED} />);
    expect(screen.getByText("Bloqueado")).toBeInTheDocument();
  });

  // Note: we intentionally do NOT assert `data-variant` — it is an
  // internal DOM detail of the shadcn/ui Badge. The variant mapping is
  // already verified by PATIENT_STATUS_BADGE_VARIANT tests above, and
  // the user-visible label is verified by `getByText`. Testing both
  // layers independently is enough to guarantee the component works.
});
