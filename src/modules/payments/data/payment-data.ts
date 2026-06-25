/**
 * Payments data provider.
 *
 * Server-only data access for the payments module. Every function takes
 * an `organizationId` so the queries are tenant-scoped — the payments
 * module must NEVER see data from a different organization.
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current `organizationId`
 *   (see `getOrganizationId()` in the dashboard module) AND for RBAC
 *   checks; this layer just scopes by org.
 * - Flatten-on-read DTO: `EnrichedPayment` is built by joining Payment
 *   with Booking (4-level nested include: patient → user, professional
 *   → user, service). The Booking-derived fields are flattened into
 *   top-level properties on the DTO.
 * - `retryPayment` is the only write — payments are webhook-driven, so
 *   the only user-initiated mutation is "retry a failed payment".
 *   The function validates `canRetry()` (domain rule) before
 *   incrementing `retryCount` and resetting `status` to PENDING.
 */

import { prisma } from "@/lib/prisma";
import {
  canRetry,
  mapProviderToBusinessStatus,
} from "@/modules/payments/domain/payment";
import type { PaymentStatusType, PaymentTypeType } from "@/modules/services/domain";

import type { Prisma } from "@/generated/prisma/client";

import type {
  EnrichedPayment,
  PaginatedPayments,
  PaymentFilters,
} from "./payment-data.types";
import { DEFAULT_PAGE_SIZE } from "./payment-data.types";

// ---------------------------------------------------------------------------
// Shared Prisma `include` — single source of truth for the list/detail shape.
//
// This is a 4-level nested include:
//   payment → booking → patient    → user (name)
//                          → professional → user (name)
//                          → service     (name, paymentType)
//
// We `select` only what we need — the booking fields (status, endTime,
// etc.) are intentionally NOT included in the list/detail DTO. The
// data layer flattens the joined names into `patientName`,
// `professionalName`, `serviceName`, `servicePaymentType`, and
// `bookingStartTime` on the EnrichedPayment.
// ---------------------------------------------------------------------------

const PAYMENT_INCLUDE = {
  booking: {
    select: {
      startTime: true,
      patient: { select: { user: { select: { name: true } } } },
      professional: { select: { user: { select: { name: true } } } },
      service: { select: { name: true, paymentType: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentWithBooking = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_INCLUDE;
}>;

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

/**
 * Thrown by `getPaymentById` and `retryPayment` when the payment does
 * not exist in the given organization. The action layer maps this to a
 * Spanish "Pago no encontrado" result. We throw instead of returning
 * null so the action can distinguish "not found" (404) from "ok" (200).
 */
export class PaymentNotFoundError extends Error {
  constructor(message = "Payment not found") {
    super(message);
    this.name = "PaymentNotFoundError";
  }
}

/**
 * Thrown by `retryPayment` when the domain rule `canRetry()` returns
 * false (status=APPROVED, or retryCount has reached DEFAULT_MAX_RETRIES).
 * The action layer maps this to a Spanish "No se puede reintentar
 * este pago" result.
 */
export class RetryNotAllowedError extends Error {
  constructor(message = "Payment is not retryable") {
    super(message);
    this.name = "RetryNotAllowedError";
  }
}

// ---------------------------------------------------------------------------
// mapToEnrichedPayment — flatten Payment + Booking into the DTO shape.
// ---------------------------------------------------------------------------

function mapToEnrichedPayment(payment: PaymentWithBooking): EnrichedPayment {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    bookingId: payment.bookingId,
    provider: payment.provider as EnrichedPayment["provider"],
    status: payment.status as EnrichedPayment["status"],
    amount: payment.amount,
    preferenceId: payment.preferenceId ?? undefined,
    externalReference: payment.externalReference ?? undefined,
    retryCount: payment.retryCount,
    parentPaymentId: payment.parentPaymentId ?? undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    bookingStartTime: payment.booking.startTime,
    patientName: payment.booking.patient?.user.name ?? "",
    professionalName: payment.booking.professional.user.name,
    serviceName: payment.booking.service.name,
    servicePaymentType: payment.booking.service.paymentType as PaymentTypeType,
    businessStatus: mapProviderToBusinessStatus(
      payment.status as EnrichedPayment["status"],
    ) as PaymentStatusType,
  };
}

// ---------------------------------------------------------------------------
// getPayments — paginated, filtered, tenant-scoped.
// ---------------------------------------------------------------------------

/**
 * List payments for an organization with optional filters and pagination.
 *
 * @param organizationId Tenant scope.
 * @param filters Optional filters (status, search, page, pageSize).
 */
export async function getPayments(
  organizationId: string,
  filters: PaymentFilters = {},
): Promise<PaginatedPayments> {
  const { status, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.PaymentWhereInput = { organizationId };

  if (status) {
    where.status = status;
  }
  if (search && search.trim().length > 0) {
    // Search matches against the linked booking's patient name OR
    // professional name. Both are joined through User via the nested
    // include. Case-insensitive match via Prisma `mode: "insensitive"`.
    where.OR = [
      {
        booking: {
          patient: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
      },
      {
        booking: {
          professional: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
      },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments: payments.map(mapToEnrichedPayment),
    total,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// getPaymentById — full detail. Null when missing/wrong org.
// ---------------------------------------------------------------------------

/**
 * Fetch a single payment by id, scoped to the organization. Returns
 * `null` when the payment doesn't exist OR belongs to a different org
 * (the WHERE clause makes them indistinguishable — that's the point).
 */
export async function getPaymentById(
  organizationId: string,
  id: string,
): Promise<EnrichedPayment | null> {
  const payment = await prisma.payment.findFirst({
    where: { id, organizationId },
    include: PAYMENT_INCLUDE,
  });

  if (!payment) {
    return null;
  }

  return mapToEnrichedPayment(payment);
}

// ---------------------------------------------------------------------------
// retryPayment — increment retryCount, reset status to PENDING.
// Throws PaymentNotFoundError or RetryNotAllowedError.
// ---------------------------------------------------------------------------

/**
 * Retry a failed payment. Validates the domain rule `canRetry()`
 * (status is not APPROVED AND retryCount < DEFAULT_MAX_RETRIES) before
 * incrementing `retryCount` and resetting `status` to PENDING. Returns
 * the updated EnrichedPayment.
 *
 * Throws `PaymentNotFoundError` when the payment doesn't exist in the
 * given organization, and `RetryNotAllowedError` when `canRetry()` is
 * false (status=APPROVED, or retryCount has reached the max).
 */
export async function retryPayment(
  organizationId: string,
  id: string,
): Promise<EnrichedPayment> {
  // 1. Existence + tenant-scope check
  const existing = await prisma.payment.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new PaymentNotFoundError();
  }

  // 2. Domain guard — only retry when status is not APPROVED and we
  //    haven't exceeded the retry cap. The Prisma `status` column is
  //    typed as `string` in the generated client; the domain rule
  //    expects the narrow `ProviderPaymentStatusType` literal union.
  //    The cast is safe because the column is constrained by the schema
  //    and the enum values are the only ones ever written.
  if (
    !canRetry({
      status: existing.status as EnrichedPayment["status"],
      retryCount: existing.retryCount,
    })
  ) {
    throw new RetryNotAllowedError();
  }

  // 3. Apply the retry: increment retryCount atomically and reset
  //    status to PENDING so the next webhook tick picks it up.
  const updated = await prisma.payment.update({
    where: { id },
    data: {
      retryCount: { increment: 1 },
      status: "PENDING",
    },
    include: PAYMENT_INCLUDE,
  });

  return mapToEnrichedPayment(updated);
}
