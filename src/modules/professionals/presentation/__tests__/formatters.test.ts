/**
 * Tests for the professionals module's es-AR presentation formatters.
 *
 * Mirrors the `services/presentation/formatters.test.ts` and
 * `patients/presentation/formatters.test.ts` patterns: pure
 * function tests, no React or DOM. The formatters are the single
 * source of truth for Argentinian Spanish labels in the professionals
 * module, so we exhaustively cover all enum values and the edge cases.
 *
 * Spec scenarios covered (from
 * `openspec/changes/professionals/specs/professionals-presentation/spec.md`):
 * - `professionals-list` — Status badge: "Activo" (emerald), "Inactivo" (gray).
 * - `professionals-list` — Specialties column formats array as comma-separated list.
 */

import { describe, expect, it } from "vitest";

import { ProfessionalStatus } from "@/modules/professionals/domain/professional";

import {
  formatSpecialties,
  getProfessionalStatusLabel,
  PROFESSIONAL_STATUS_LABEL,
} from "@/modules/professionals/presentation/formatters";

// ---------------------------------------------------------------------------
// PROFESSIONAL_STATUS_LABEL — exhaustive coverage
// ---------------------------------------------------------------------------

describe("PROFESSIONAL_STATUS_LABEL", () => {
  it("maps ACTIVE → 'Activo' (Argentinian Spanish)", () => {
    expect(PROFESSIONAL_STATUS_LABEL[ProfessionalStatus.ACTIVE]).toBe("Activo");
  });

  it("maps INACTIVE → 'Inactivo'", () => {
    expect(PROFESSIONAL_STATUS_LABEL[ProfessionalStatus.INACTIVE]).toBe(
      "Inactivo",
    );
  });

  it("covers all 2 ProfessionalStatus values (exhaustive)", () => {
    const all = Object.values(ProfessionalStatus);
    for (const status of all) {
      expect(PROFESSIONAL_STATUS_LABEL[status]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// getProfessionalStatusLabel — function form
// ---------------------------------------------------------------------------

describe("getProfessionalStatusLabel", () => {
  it("returns 'Activo' for ACTIVE", () => {
    expect(getProfessionalStatusLabel(ProfessionalStatus.ACTIVE)).toBe("Activo");
  });

  it("returns 'Inactivo' for INACTIVE", () => {
    expect(getProfessionalStatusLabel(ProfessionalStatus.INACTIVE)).toBe(
      "Inactivo",
    );
  });

  it("falls back to the raw status string when unknown (defensive)", () => {
    expect(
      getProfessionalStatusLabel(
        "UNKNOWN" as unknown as (typeof ProfessionalStatus)[keyof typeof ProfessionalStatus],
      ),
    ).toBe("UNKNOWN");
  });
});

// ---------------------------------------------------------------------------
// formatSpecialties — comma-separated join with em-dash fallback for empty
// ---------------------------------------------------------------------------

describe("formatSpecialties", () => {
  it("joins multiple specialties with ', ' (Dermatología, Cirugía)", () => {
    expect(formatSpecialties(["Dermatología", "Cirugía"])).toBe(
      "Dermatología, Cirugía",
    );
  });

  it("returns the single specialty unchanged when there is only one", () => {
    expect(formatSpecialties(["Dermatología"])).toBe("Dermatología");
  });

  it("returns the em-dash placeholder when the array is empty", () => {
    expect(formatSpecialties([])).toBe("—");
  });

  it("preserves the order of the input array", () => {
    expect(
      formatSpecialties(["Cardiología", "Pediatría", "Traumatología"]),
    ).toBe("Cardiología, Pediatría, Traumatología");
  });
});
