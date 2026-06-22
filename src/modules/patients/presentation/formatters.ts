/**
 * Patients presentation formatters.
 *
 * Pure, dependency-free helpers for rendering patient data in the UI.
 * Mirrors the bookings `formatters.ts` pattern: status → label map,
 * plus a small set of display helpers. Importable from both Server
 * and Client Components.
 *
 * Conventions:
 * - All labels in Argentinian Spanish (es-AR).
 * - No React, no Next.js, no Prisma. Pure functions.
 * - The status label map is exported (mirroring the dashboard's
 *   `today-bookings.tsx` pattern) so consumers like the dashboard
 *   module can render the same labels.
 */

import { PatientStatus, type PatientStatusType } from "../domain/patient";

// ---------------------------------------------------------------------------
// Status labels — Argentinian Spanish
// ---------------------------------------------------------------------------

/**
 * Patient status → human label in Argentinian Spanish. Keys are the
 * 3 values of `PatientStatusType`. Used by the status badge on the
 * list page, the detail page, and any other component that needs to
 * render a status.
 */
export const PATIENT_STATUS_LABEL: Record<PatientStatusType, string> = {
  [PatientStatus.ACTIVE]: "Activo",
  [PatientStatus.INACTIVE]: "Inactivo",
  [PatientStatus.BLOCKED]: "Bloqueado",
};

/**
 * Returns the Argentinian Spanish label for a patient status.
 * Falls back to the raw status string when unknown (defensive).
 */
export function getPatientStatusLabel(status: PatientStatusType): string {
  return PATIENT_STATUS_LABEL[status] ?? status;
}

// ---------------------------------------------------------------------------
// Name formatting
// ---------------------------------------------------------------------------

/**
 * Returns the full name of a patient, trimmed. Falls back to an empty
 * string when the name is undefined/null. Centralized here so the
 * "—" fallback for missing data is consistent across the table and
 * the detail page.
 */
export function formatPatientName(fullName: string | undefined | null): string {
  if (fullName === undefined || fullName === null) return "";
  return fullName.trim();
}
