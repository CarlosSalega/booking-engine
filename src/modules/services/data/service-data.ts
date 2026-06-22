/**
 * Services data provider.
 *
 * Server-only data access for the services module. Every function takes
 * an `organizationId` so the queries are tenant-scoped — the services
 * module must NEVER see data from a different organization.
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current `organizationId`
 *   (see `getOrganizationId()` in the dashboard module) AND for RBAC
 *   checks; this layer just scopes by org.
 * - Flatten-on-read DTO: `EnrichedService` is built by joining
 *   Service with Professional→User (identity: name). Money<->Float
 *   mapping happens here, with ARS hardcoded (AD1).
 * - `professionalId` is a persistence bridge: accepted in inputs,
 *   exposed in the DTO, but absent from the domain `Service` type.
 * - `paymentStatus` (Prisma column) is intentionally ignored — it's
 *   a booking concern and is not part of the services domain.
 * - `updateService` uses `$transaction` to atomically check ownership
 *   and apply the update.
 */

import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/generated/prisma/client";

import type { PaymentTypeType, ServiceStatusType } from "../domain/service";
import {
  DEFAULT_PAGE_SIZE,
  type CreateServiceInput,
  type EnrichedService,
  type PaginatedServices,
  type ServiceFilters,
  type UpdateServiceInput,
} from "./service-data.types";

// ---------------------------------------------------------------------------
// Shared Prisma `include` — single source of truth for the list/detail shape.
// We pull Professional→User.name so we can flatten it into `professionalName`
// in the EnrichedService DTO. Currency is hardcoded to ARS (AD1).
// ---------------------------------------------------------------------------

const SERVICE_INCLUDE = {
  professional: {
    select: {
      id: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.ServiceInclude;

type ServiceWithProfessional = Prisma.ServiceGetPayload<{
  include: typeof SERVICE_INCLUDE;
}>;

// ---------------------------------------------------------------------------
// ServiceNotFoundError — thrown by updateService when the service does not
// exist in the given organization. The action layer maps this to a Spanish
// "Servicio no encontrado" result. We throw instead of returning null so
// the action can distinguish "not found" (404) from "updated" (200).
// ---------------------------------------------------------------------------

export class ServiceNotFoundError extends Error {
  constructor(message = "Service not found") {
    super(message);
    this.name = "ServiceNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// mapToEnrichedService — flatten Service + Professional→User into the
// domain DTO shape. Money<->Float mapping (AD1): Float → Money with ARS.
// `depositAmount: null` (Prisma) → `undefined` (DTO) so the consumer sees
// a missing value, not a sentinel.
// ---------------------------------------------------------------------------

function mapToEnrichedService(
  service: ServiceWithProfessional,
): EnrichedService {
  return {
    id: service.id,
    organizationId: service.organizationId,
    name: service.name,
    description: service.description ?? undefined,
    durationMinutes: service.durationMinutes,
    price:
      service.price !== null && service.price !== undefined
        ? { amount: service.price, currency: "ARS" }
        : undefined,
    depositAmount:
      service.depositAmount !== null && service.depositAmount !== undefined
        ? { amount: service.depositAmount, currency: "ARS" }
        : undefined,
    paymentType: service.paymentType as PaymentTypeType,
    status: service.status as ServiceStatusType,
    professionalId: service.professional.id,
    professionalName: service.professional.user.name,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// getServices — paginated, filtered, tenant-scoped.
// ---------------------------------------------------------------------------

/**
 * List services for an organization with optional filters and pagination.
 *
 * @param organizationId Tenant scope.
 * @param filters Optional filters (status, search, page, pageSize).
 */
export async function getServices(
  organizationId: string,
  filters: ServiceFilters = {},
): Promise<PaginatedServices> {
  const { status, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.ServiceWhereInput = { organizationId };

  if (status) {
    where.status = status;
  }
  if (search && search.trim().length > 0) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: SERVICE_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services: services.map(mapToEnrichedService),
    total,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// getServiceById — single service with professional name. Null when missing
// or in a different org (the WHERE clause makes them indistinguishable).
// ---------------------------------------------------------------------------

/**
 * Fetch a single service by id, scoped to the organization. Returns
 * `null` when the service doesn't exist OR belongs to a different org.
 */
export async function getServiceById(
  organizationId: string,
  id: string,
): Promise<EnrichedService | null> {
  const service = await prisma.service.findFirst({
    where: { id, organizationId },
    include: SERVICE_INCLUDE,
  });

  if (!service) {
    return null;
  }

  return mapToEnrichedService(service);
}

// ---------------------------------------------------------------------------
// createService — single-table write (Service). Maps Money → Float on write.
// ---------------------------------------------------------------------------

/**
 * Create a new service. Maps the domain `Money` value object to a raw
 * Float for the Prisma `price` and `depositAmount` columns (AD1). Currency
 * is dropped on write — the data layer hardcodes ARS on read.
 *
 * `professionalId` is a persistence bridge: the domain `Service` type
 * does not carry it, but the Prisma model requires it. The data layer
 * accepts and persists it, then exposes it via the `EnrichedService` DTO.
 */
export async function createService(
  organizationId: string,
  data: CreateServiceInput,
): Promise<EnrichedService> {
  const service = await prisma.service.create({
    data: {
      organizationId,
      professionalId: data.professionalId,
      name: data.name,
      description: data.description,
      durationMinutes: data.durationMinutes,
      price: data.price?.amount ?? 0,
      depositAmount: data.depositAmount?.amount ?? null,
      paymentType: data.paymentType,
      status: data.status,
    },
    include: SERVICE_INCLUDE,
  });

  return mapToEnrichedService(service);
}

// ---------------------------------------------------------------------------
// updateService — atomic check + update via $transaction. Throws
// ServiceNotFoundError when the service doesn't exist in the org.
// ---------------------------------------------------------------------------

/**
 * Update an existing service. The ownership check (`findFirst` scoped to
 * the org) and the update happen inside a single `$transaction` so the
 * service can never be updated by an org that doesn't own it. Throws
 * `ServiceNotFoundError` when the service is missing or in a different
 * organization — the action maps this to a user-facing
 * "Servicio no encontrado" error.
 *
 * Money<->Float mapping (AD1): if `price` is provided, the data layer
 * flattens `price.amount` to Float before writing. Same for `depositAmount`.
 */
export async function updateService(
  organizationId: string,
  id: string,
  data: UpdateServiceInput,
): Promise<EnrichedService> {
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Verify the service exists in the org.
    const existing = await tx.service.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) {
      throw new ServiceNotFoundError();
    }

    // 2. Build the partial update payload — only the provided fields.
    return tx.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.durationMinutes !== undefined
          ? { durationMinutes: data.durationMinutes }
          : {}),
        ...(data.price !== undefined
          ? { price: data.price.amount }
          : {}),
        ...(data.depositAmount !== undefined
          ? {
              depositAmount:
                data.depositAmount === null ? null : data.depositAmount.amount,
            }
          : {}),
        ...(data.paymentType !== undefined
          ? { paymentType: data.paymentType }
          : {}),
        ...(data.professionalId !== undefined
          ? { professionalId: data.professionalId }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: SERVICE_INCLUDE,
    });
  });

  return mapToEnrichedService(updated);
}
