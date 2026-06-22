/**
 * Services data layer — public types.
 *
 * These types are the contract between the data layer and its callers
 * (Server Components, Server Actions, tests). The data layer is pure:
 * no React, no Next.js, no auth wiring here. Every function takes an
 * `organizationId` so the queries are tenant-scoped.
 *
 * Flatten-on-read DTO: the domain `Service` shape is built by joining
 * Service with Professional→User (identity: name). The data layer exposes
 * `EnrichedService` with the resolved `professionalId` and `professionalName`
 * — these fields are persistence bridges, not domain concerns.
 *
 * Money<->Float mapping (AD1): Prisma stores `price` and `depositAmount`
 * as raw Float. Callers always pass/ receive `Money` value objects;
 * the data layer flattens to Float on write and rebuilds Money on read
 * with currency hardcoded to ARS.
 */

import type { Service } from "../domain/service.schema";
import type {
  PaymentTypeType,
  ServiceStatusType,
} from "../domain/service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default page size for the services list. */
export const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Filters and pagination
// ---------------------------------------------------------------------------

/**
 * Filters for `getServices`. All fields are optional and AND-ed together.
 *
 * - `status` — exact match on the Service's `status` (enum).
 * - `search` — text matched against the service's name/description.
 *   Case-insensitive via Prisma `mode: "insensitive"`.
 * - `page` / `pageSize` — pagination, 1-indexed.
 */
export interface ServiceFilters {
  status?: ServiceStatusType;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated wrapper used by `getServices`. */
export interface PaginatedServices {
  services: EnrichedService[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Enriched DTO
// ---------------------------------------------------------------------------

/**
 * Service row enriched with `professionalId` and `professionalName`.
 *
 * Extends the domain `Service` shape with the professional's identity
 * (id + name from the joined User). The domain intentionally does NOT
 * carry `professionalId` (services are org-level catalog items) — the
 * data layer bridges persistence and presentation.
 */
export interface EnrichedService extends Service {
  professionalId: string;
  professionalName: string;
}

// ---------------------------------------------------------------------------
// Write inputs — callers pass `Money`, data layer flattens to Float.
// ---------------------------------------------------------------------------

/** Fields callers can pass to `createService`. */
export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  /** Domain `Money` — the data layer stores `price: amount` as Float. */
  price?: { amount: number; currency: "ARS" | "USD" };
  paymentType: PaymentTypeType;
  /** Domain `Money` — required when `paymentType === "DEPOSIT"`. */
  depositAmount?: { amount: number; currency: "ARS" | "USD" };
  /**
   * Persistence bridge: not in the domain `Service` type, but required
   * by the Prisma `Service` model. The data layer accepts and persists it.
   */
  professionalId: string;
  status: ServiceStatusType;
}

/**
 * Fields callers can pass to `updateService`. Every field is optional —
 * only the provided fields are written.
 */
export interface UpdateServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: { amount: number; currency: "ARS" | "USD" };
  paymentType?: PaymentTypeType;
  depositAmount?: { amount: number; currency: "ARS" | "USD" } | null;
  professionalId?: string;
  status?: ServiceStatusType;
}
