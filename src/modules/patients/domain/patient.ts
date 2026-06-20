import type { Patient, PatientData } from "./patient.schema";

export const PatientStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
} as const;

export type PatientStatusType =
  (typeof PatientStatus)[keyof typeof PatientStatus];

function normalizeName(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value.trim().toLowerCase();
}

function normalizePhone(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value.trim();
}

export function patientMatches(
  a: Patient | PatientData,
  b: Patient | PatientData,
): boolean {
  const aName = normalizeName(a.fullName);
  const bName = normalizeName(b.fullName);
  const nameMatches =
    aName !== undefined &&
    bName !== undefined &&
    aName.length > 0 &&
    aName === bName;

  const aEmail = normalizeEmail(a.email);
  const bEmail = normalizeEmail(b.email);
  const emailMatches =
    nameMatches &&
    aEmail !== undefined &&
    bEmail !== undefined &&
    aEmail.length > 0 &&
    aEmail === bEmail;

  if (emailMatches) return true;

  const aPhone = normalizePhone(a.phone);
  const bPhone = normalizePhone(b.phone);
  const phoneMatches =
    nameMatches &&
    aPhone !== undefined &&
    bPhone !== undefined &&
    aPhone.length > 0 &&
    aPhone === bPhone;

  if (phoneMatches) return true;

  if (
    a.documentId !== undefined &&
    b.documentId !== undefined &&
    a.documentId.length > 0 &&
    a.documentId === b.documentId
  ) {
    return true;
  }

  return false;
}
