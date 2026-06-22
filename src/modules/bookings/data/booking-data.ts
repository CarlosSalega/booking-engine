/**
 * Bookings data provider.
 *
 * Server-only data access for the bookings module. Every function takes
 * an `organizationId` so the queries are tenant-scoped — the bookings
 * module must NEVER see data from a different organization.
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current `organizationId`
 *   (see `getOrganizationId()` in the dashboard module) AND any RBAC
 *   scoping via `BookingFilters.professionalUserId`.
 * - All time-bucketing uses the server's local clock.
 */

import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/generated/prisma/client";

import {
  DEFAULT_PAGE_SIZE,
  type BookingFilters,
  type EnrichedBooking,
  type PaginatedBookings,
  type PatientOption,
  type ProfessionalOption,
  type ServiceOption,
} from "./booking-data.types";

// ---------------------------------------------------------------------------
// Shared Prisma `include` — single source of truth for the list/detail shape.
// Keeps every consumer (getBookings, getBookingById, future tests) aligned.
// ---------------------------------------------------------------------------

const BOOKING_INCLUDE = {
  patient: { select: { id: true, user: { select: { name: true, email: true } } } },
  professional: { select: { id: true, userId: true, user: { select: { name: true } } } },
  service: {
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      price: true,
      paymentType: true,
    },
  },
  payments: { select: { id: true, status: true, amount: true } },
} satisfies Prisma.BookingInclude;

// ---------------------------------------------------------------------------
// getBookings — paginated, filtered, optionally RBAC-scoped.
// ---------------------------------------------------------------------------

/**
 * List bookings for an organization with optional filters and pagination.
 *
 * RBAC scoping: when `filters.professionalUserId` is provided, the query
 * is restricted to bookings whose professional's user matches. The data
 * layer does NOT import auth — the caller resolves the session and
 * passes the user id explicitly.
 *
 * @param organizationId Tenant scope.
 * @param filters Optional filters (status, date range, search, etc.).
 */
export async function getBookings(
  organizationId: string,
  filters: BookingFilters = {},
): Promise<PaginatedBookings> {
  const {
    dateRange,
    professionalId,
    serviceId,
    status,
    search,
    professionalUserId,
    patientId,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filters;

  const where: Prisma.BookingWhereInput = { organizationId };

  if (dateRange) {
    where.startTime = { gte: dateRange.start, lte: dateRange.end };
  }
  if (professionalId) where.professionalId = professionalId;
  if (serviceId) where.serviceId = serviceId;
  if (status && status.length > 0) {
    where.status = { in: status };
  }
  if (professionalUserId) {
    where.professional = { userId: professionalUserId };
  }
  if (patientId) {
    where.patientId = patientId;
  }
  if (search) {
    where.OR = [
      { patient: { user: { name: { contains: search, mode: "insensitive" } } } },
      { patient: { user: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: BOOKING_INCLUDE,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings as unknown as EnrichedBooking[],
    total,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// getBookingById — full detail with relations. Null when missing/wrong org.
// ---------------------------------------------------------------------------

/**
 * Fetch a single booking by id, scoped to the organization. Returns
 * `null` when the booking doesn't exist OR belongs to a different org
 * (the WHERE clause makes them indistinguishable — that's the point).
 */
export async function getBookingById(
  organizationId: string,
  id: string,
): Promise<EnrichedBooking | null> {
  const booking = await prisma.booking.findFirst({
    where: { id, organizationId },
    include: BOOKING_INCLUDE,
  });

  return (booking as unknown as EnrichedBooking | null) ?? null;
}

// ---------------------------------------------------------------------------
// getServices — ACTIVE services for the wizard step 1.
// ---------------------------------------------------------------------------

/**
 * List ACTIVE services for the given organization. Used by the wizard
 * step 1 (service selection).
 */
export async function getServices(
  organizationId: string,
): Promise<ServiceOption[]> {
  const services = await prisma.service.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      price: true,
      durationMinutes: true,
      paymentType: true,
    },
    orderBy: { name: "asc" },
  });

  return services as unknown as ServiceOption[];
}

// ---------------------------------------------------------------------------
// getPatients — patient search for the wizard step 4.
// ---------------------------------------------------------------------------

/**
 * Search patients by name or email. When `search` is omitted, returns
 * all ACTIVE patients for the organization (capped to 20 to avoid
 * unbounded reads in the wizard UI).
 */
export async function getPatients(
  organizationId: string,
  search?: string,
): Promise<PatientOption[]> {
  const where: Prisma.PatientWhereInput = { organizationId, status: "ACTIVE" };

  if (search && search.trim().length > 0) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const patients = await prisma.patient.findMany({
    where,
    select: { id: true, user: { select: { name: true, email: true } } },
    take: 20,
    orderBy: { user: { name: "asc" } },
  });

  return patients as unknown as PatientOption[];
}

// ---------------------------------------------------------------------------
// getProfessionalsForService — wizard step 2.
// ---------------------------------------------------------------------------

/**
 * List ACTIVE professionals who offer the given service. Used by the
 * wizard step 2 (professional selection).
 */
export async function getProfessionalsForService(
  organizationId: string,
  serviceId: string,
): Promise<ProfessionalOption[]> {
  const professionals = await prisma.professional.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      services: { some: { id: serviceId } },
    },
    select: {
      id: true,
      userId: true,
      specialties: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return professionals as unknown as ProfessionalOption[];
}
