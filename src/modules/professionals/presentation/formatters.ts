/**
 * Professionals presentation formatters.
 *
 * Pure, dependency-free helpers for rendering professional data in the UI.
 * Mirrors the services `formatters.ts` and patients `formatters.ts` patterns:
 * status → label map plus a small set of display helpers. Importable from
 * both Server and Client Components.
 *
 * Conventions:
 * - All labels in Argentinian Spanish (es-AR).
 * - No React, no Next.js, no Prisma. Pure functions.
 * - The status label map is exported so consumers (badge, filter, detail
 *   card) can render the same labels from a single source of truth.
 */

import {
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "../domain/professional";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Placeholder shown for empty specialty arrays. */
const EMPTY_PLACEHOLDER = "—";

// ---------------------------------------------------------------------------
// Status labels — Argentinian Spanish
// ---------------------------------------------------------------------------

/**
 * Professional status → human label in Argentinian Spanish. Keys are
 * the 2 values of `ProfessionalStatusType`. Used by the status badge,
 * the status filter, and the detail page.
 */
export const PROFESSIONAL_STATUS_LABEL: Record<ProfessionalStatusType, string> = {
  [ProfessionalStatus.ACTIVE]: "Activo",
  [ProfessionalStatus.INACTIVE]: "Inactivo",
};

/**
 * Returns the Argentinian Spanish label for a professional status.
 * Falls back to the raw status string when unknown (defensive).
 */
export function getProfessionalStatusLabel(
  status: ProfessionalStatusType,
): string {
  return PROFESSIONAL_STATUS_LABEL[status] ?? status;
}

// ---------------------------------------------------------------------------
// Specialties — comma-separated display
// ---------------------------------------------------------------------------

/**
 * Joins a professional's `specialties` array into a single comma-
 * separated string for the list and detail views.
 *
 * Behavior:
 * - Empty array → returns the em-dash placeholder ("—") so the column
 *   never renders an empty cell.
 * - Single-element array → returns the element as-is (no comma).
 * - Multi-element array → joins with ", " preserving the input order
 *   (the order comes from the data layer, which preserves the order
 *   the professional entered them via the form).
 */
export function formatSpecialties(specialties: string[]): string {
  if (specialties.length === 0) {
    return EMPTY_PLACEHOLDER;
  }
  return specialties.join(", ");
}
