/**
 * Professionals data layer — public types.
 *
 * These types are the contract between the data layer and its callers
 * (Server Components, Server Actions, tests). The data layer is pure:
 * no React, no Next.js, no auth wiring here. Every function takes an
 * `organizationId` so the queries are tenant-scoped.
 *
 * Flatten-on-read DTO: the domain `Professional` shape is built by
 * joining Professional with User (identity: name, email, image). The
 * data layer exposes `EnrichedProfessional` with all flattened fields
 * already merged — callers never touch the raw `user` relation.
 *
 * Split-write pattern: `createProfessional` writes User + Professional
 * inside a single `$transaction` so the two records stay consistent.
 * `updateProfessional` updates User (name/email) + Professional
 * (specialties/license/bio/status) in the same transaction.
 */

import type { Professional, ProfessionalData } from "../domain/professional.schema";
import type { ProfessionalStatusType } from "../domain/professional";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default page size for the professionals list. */
export const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Filters and pagination
// ---------------------------------------------------------------------------

/**
 * Filters for `getProfessionals`. All fields are optional and AND-ed together.
 *
 * - `status` — exact match on the Professional's `status` (enum).
 * - `search` — text matched against the linked user's name/email.
 *   Case-insensitive via Prisma `mode: "insensitive"`.
 * - `page` / `pageSize` — pagination, 1-indexed.
 */
export interface ProfessionalFilters {
  status?: ProfessionalStatusType;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated wrapper used by `getProfessionals`. */
export interface PaginatedProfessionals {
  professionals: EnrichedProfessional[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Enriched DTO
// ---------------------------------------------------------------------------

/**
 * Professional row enriched with the flattened User identity.
 *
 * Identical to the domain `Professional` type because the domain already
 * carries the flattened `fullName` / `email` / `image` fields. Defined
 * as an alias type so callers can rely on the data-layer contract
 * independently of the domain — keeps the DTOs a stable surface for
 * Server Components.
 */
export type EnrichedProfessional = Professional;

// ---------------------------------------------------------------------------
// Write inputs — callers pass the `ProfessionalData` shape, the data
// layer splits it into User + Professional inside `$transaction`.
// ---------------------------------------------------------------------------

/** Fields callers can pass to `createProfessional`. Mirrors `ProfessionalData`. */
export type CreateProfessionalInput = ProfessionalData;

/**
 * Fields callers can pass to `updateProfessional`. Every field is optional —
 * only the provided fields are written. `fullName` and `email` target the
 * linked `User` row; the rest target the `Professional` row.
 */
export interface UpdateProfessionalInput {
  fullName?: string;
  email?: string;
  specialties?: string[];
  license?: string | null;
  bio?: string | null;
  status?: ProfessionalStatusType;
}
