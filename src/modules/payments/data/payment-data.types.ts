/**
 * Payments data layer — public types.
 *
 * These types are the contract between the data layer and its callers
 * (Server Components, Server Actions, tests). The data layer is pure:
 * no React, no Next.js, no auth wiring here. Every function takes an
 * `organizationId` so the queries are tenant-scoped.
 *
 * Flatten-on-read DTO: the domain `Payment` shape is built by joining
 * Payment with Booking → Patient/User, Booking → Professional/User, and
 * Booking → Service via a 4-level nested Prisma `include`. The data
 * layer exposes `EnrichedPayment` with the joined fields flattened into
 * top-level properties (`patientName`, `professionalName`, `serviceName`,
 * `servicePaymentType`, `bookingStartTime`).
 *
 * The `businessStatus` field is computed on read via
 * `mapProviderToBusinessStatus` from the domain layer — it converts
 * the raw MercadoPago status (PENDING/IN_PROCESS/APPROVED/...) into
 * the business-level PENDING/PAID/FAILED status used by the rest of
 * the application.
 */

import type { PaymentStatusType, PaymentTypeType } from "@/modules/services/domain";

import type {
  Payment,
  ProviderPaymentStatusType,
} from "../domain/payment";

/** Default page size for the payments list. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Filters for `getPayments`. All fields are optional and AND-ed together.
 *
 * - `status` — exact match on the Payment's `status` (ProviderPaymentStatus enum).
 * - `search` — text matched against the linked booking's patient name OR
 *   professional name. Case-insensitive via Prisma `mode: "insensitive"`.
 * - `page` / `pageSize` — pagination, 1-indexed.
 */
export interface PaymentFilters {
  status?: ProviderPaymentStatusType;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated wrapper used by `getPayments`. */
export interface PaginatedPayments {
  payments: EnrichedPayment[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Payment row enriched with the Booking join (flattened).
 *
 * Extends the domain `Payment` shape with the booking's `startTime`,
 * the patient's and professional's names (resolved through User), the
 * service name, the service payment type, and the computed business
 * status.
 */
export interface EnrichedPayment extends Payment {
  /** Booking start time (booking.startTime). */
  bookingStartTime: Date;
  /** Patient full name (booking.patient.user.name). */
  patientName: string;
  /** Professional full name (booking.professional.user.name). */
  professionalName: string;
  /** Service name (booking.service.name). */
  serviceName: string;
  /** Service payment type (booking.service.paymentType). */
  servicePaymentType: PaymentTypeType;
  /**
   * Business-level status derived from `status` via
   * `mapProviderToBusinessStatus`. PENDING/IN_PROCESS → PENDING,
   * APPROVED → PAID, REJECTED/CANCELLED → FAILED.
   */
  businessStatus: PaymentStatusType;
}
