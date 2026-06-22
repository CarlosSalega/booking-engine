/**
 * Patients data layer — public types.
 *
 * These types are the contract between the data layer and its callers
 * (Server Components, Server Actions, tests). The data layer is pure:
 * no React, no Next.js, no auth wiring here. Every function takes an
 * `organizationId` so the queries are tenant-scoped.
 *
 * Flatten-on-read DTO: the domain `Patient` shape is built by joining
 * Patient with User (identity: name + email) plus a separate lookup for
 * `createdByUser` (audit: name). The data layer exposes `EnrichedPatient`
 * with both fields merged.
 *
 * `createdByUserId` is a plain string column (no Prisma relation) — the
 * data layer batches `user.findMany` lookups for the creator names.
 */

import type { Patient } from "../domain/patient.schema";
import type { PatientStatusType } from "../domain/patient";

/** Default page size for the patients list. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Filters for `getPatients`. All fields are optional and AND-ed together.
 *
 * - `status` — exact match on the Patient's `status` (enum).
 * - `search` — text matched against the linked user's name/email.
 *   Case-insensitive via Prisma `mode: "insensitive"`.
 * - `page` / `pageSize` — pagination, 1-indexed.
 */
export interface PatientFilters {
  status?: PatientStatusType;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated wrapper used by `getPatients`. */
export interface PaginatedPatients {
  patients: EnrichedPatient[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Patient row enriched with the audit `createdByUserName`.
 *
 * Extends the domain `Patient` shape with the creator's name. The domain
 * already carries `createdByUserId` (added in PR #1 domain change); this
 * type adds the resolved name from a separate User lookup.
 */
export interface EnrichedPatient extends Patient {
  createdByUserName: string | null;
}

/** Fields callers can pass to `createPatient`. Mirrors the `PatientData` shape. */
export interface CreatePatientInput {
  fullName: string;
  /**
   * Required: the Better Auth `User.email` column is `NOT NULL UNIQUE`.
   * The domain schema treats email as optional (legacy), but the data
   * layer enforces it because the underlying User row needs it.
   */
  email: string;
  phone?: string;
  documentId?: string;
  status: PatientStatusType;
  notes?: string;
}

/** Fields callers can pass to `updatePatient`. Every field is optional. */
export interface UpdatePatientInput {
  fullName?: string;
  email?: string;
  phone?: string;
  documentId?: string;
  status?: PatientStatusType;
  notes?: string;
}
