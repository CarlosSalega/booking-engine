"use server";

/**
 * retryPayment Server Action.
 *
 * The single user-initiated mutation in the payments module: increments
 * a failed payment's `retryCount` and resets its `status` to PENDING.
 * Payments are webhook-driven — this is the only client-side write.
 *
 * Pipeline (per design AD3 + AD7):
 *   1. Zod 4 validate input (`retryPaymentSchema`)
 *   2. Auth: `auth.api.getSession()` — no session → "No autorizado"
 *   3. RBAC: only ADMIN + SECRETARY allowed
 *   4. Resolve `organizationId` via `getOrganizationId()`
 *   5. Verify the payment exists in the org via `getPaymentById`
 *   6. Delegate to the data-layer `retryPayment` (which enforces
 *      `canRetry()` and throws on `PaymentNotFoundError` or
 *      `RetryNotAllowedError`)
 *   7. Revalidate `/dashboard/payments` and `/dashboard/payments/[id]`
 *   8. Return `{ success: true, data: EnrichedPayment }`
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish, from the schema)
 * - No session → "No autorizado"
 * - PROFESSIONAL or PATIENT role → "No autorizado"
 * - Payment not found in org → "Pago no encontrado"
 * - `canRetry()` false (status=APPROVED or retryCount≥3) →
 *   "No se puede reintentar este pago"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import {
  PaymentNotFoundError,
  RetryNotAllowedError,
  getPaymentById,
  retryPayment as retryPaymentData,
} from "@/modules/payments/data/payment-data";

import { retryPaymentSchema } from "./payment-actions.schema";
import type {
  PaymentResult,
  RetryPaymentInput,
} from "./payment-actions.types";
import type { EnrichedPayment } from "../data/payment-data.types";

export async function retryPayment(
  input: RetryPaymentInput,
): Promise<PaymentResult<EnrichedPayment>> {
  // 1. Zod 4 validation
  const parsed = retryPaymentSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: only ADMIN + SECRETARY can retry payments. PROFESSIONAL is
  //    rejected as read-only (mirrors `changeServiceStatus`); PATIENT is
  //    defense-in-depth (the dashboard layout already blocks PATIENT
  //    from the payments section, but the action enforces the rule
  //    anyway so an exposed route cannot bypass the check).
  const role = session.user.role;
  if (role !== USER_ROLE.ADMIN && role !== USER_ROLE.SECRETARY) {
    return { success: false, error: "No autorizado" };
  }

  const organizationId = await getOrganizationId();

  // 4. Verify the payment exists in the org (and is the right org).
  //    `getPaymentById` returns `null` for both missing records and
  //    wrong-org access — the WHERE clause makes them indistinguishable
  //    on purpose (cross-tenant protection).
  const existing = await getPaymentById(organizationId, parsed.data.paymentId);
  if (!existing) {
    return { success: false, error: "Pago no encontrado" };
  }

  // 5. Delegate to the data layer. The data layer is the only place
  //    that knows about `canRetry()` and the Prisma update shape.
  let updated;
  try {
    updated = await retryPaymentData(organizationId, parsed.data.paymentId);
  } catch (error) {
    if (error instanceof PaymentNotFoundError) {
      // Race condition: the payment existed at step 4 but disappeared
      // before the data-layer retry. Map to the same "not found" result.
      return { success: false, error: "Pago no encontrado" };
    }
    if (error instanceof RetryNotAllowedError) {
      return { success: false, error: "No se puede reintentar este pago" };
    }
    throw error;
  }

  // 6. Revalidate the affected paths so the next render shows fresh data.
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/payments/[id]", "page");

  return { success: true, data: updated };
}
