/**
 * Bookings data layer — public types.
 *
 * These types are the contract between the data layer and its callers
 * (Server Components, Server Actions, tests). The data layer is pure:
 * no React, no Next.js, no auth wiring here. Every function takes an
 * `organizationId` so the queries are tenant-scoped.
 *
 * RBAC scoping: callers pass `professionalUserId` in `BookingFilters`
 * to restrict bookings to a single professional. The data layer adds
 * `where: { professional: { userId } }` to the query — no auth import.
 */

import type { BookingStatusType } from "../domain/booking";
import type { PaymentStatusType, PaymentTypeType } from "@/modules/services/domain";

/** Default page size for the bookings list. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Filters for `getBookings`. All fields are optional and AND-ed together.
 *
 * - `dateRange` — bounds the booking's `startTime`.
 * - `professionalId` — exact match on the Booking's `professionalId`.
 * - `serviceId` — exact match on the Booking's `serviceId`.
 * - `status` — booking statuses to include (uses Prisma `in`).
 * - `search` — text matched against the linked patient's user name/email.
 * - `professionalUserId` — RBAC scoping; when set, only bookings whose
 *   `professional.userId` matches are returned. Data layer must NOT
 *   import auth — the caller resolves the session and passes this.
 * - `patientId` — filter by the linked Patient. Added in the patients
 *   change (AD5) so the patient detail page can show a single patient's
 *   booking history. Backwards-compatible: undefined → no filter.
 * - `page` / `pageSize` — pagination, 1-indexed.
 */
export interface BookingFilters {
  dateRange?: { start: Date; end: Date };
  professionalId?: string;
  serviceId?: string;
  status?: BookingStatusType[];
  search?: string;
  professionalUserId?: string;
  patientId?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated wrapper used by `getBookings`. */
export interface PaginatedBookings {
  bookings: EnrichedBooking[];
  total: number;
  page: number;
  pageSize: number;
}

/** Booking row enriched with the relations the list/detail pages need. */
export interface EnrichedBooking {
  id: string;
  organizationId: string;
  patientId: string | null;
  professionalId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatusType;
  paymentStatus: PaymentStatusType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    user: { name: string; email: string };
  } | null;
  professional: {
    id: string;
    userId: string;
    user: { name: string };
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    paymentType: PaymentTypeType;
  };
  payments: { id: string; status: string; amount: number }[];
}

/** A minimal service projection used by the wizard step 1. */
export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  paymentType: PaymentTypeType;
}

/** A minimal patient projection used by the wizard step 4. */
export interface PatientOption {
  id: string;
  user: { name: string; email: string };
}

/** A minimal professional projection used by the wizard step 2. */
export interface ProfessionalOption {
  id: string;
  userId: string;
  user: { name: string };
  specialties: string[];
}
