/**
 * `/dashboard/payments/[id]` — operator-facing detail view for one
 * payment.
 *
 * Server Component. Responsibilities (enforced server-side, never
 * trust the client):
 * 1. Read `params.id` from the dynamic route.
 * 2. Resolve `organizationId` from the active org cookie.
 * 3. Fetch the payment with `getPaymentById(orgId, id)` — this
 *    returns `null` when the payment is in a different org, so
 *    cross-tenant access is silently blocked.
 * 4. Resolve the session role + domain rule so the Retry button
 *    can be hidden for PROFESSIONAL (read-only per AD7) or when
 *    the payment is in a non-retryable state.
 * 5. `null` from `getPaymentById` → `notFound()` (404).
 * 6. Hand the enriched payment to the `<PaymentDetailCard>` Client
 *    Component, which owns the visual presentation + the retry
 *    button.
 *
 * The page itself is intentionally thin: the data layer owns
 * scoping and 404 semantics; the Client Component owns rendering.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getPaymentById } from "@/modules/payments";
import { canRetry } from "@/modules/payments/domain/payment";

import { PaymentDetailCard } from "@/components/payments/payment-detail-card";

interface PaymentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({
  params,
}: PaymentDetailPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const payment = await getPaymentById(organizationId, id);

  if (!payment) {
    // Payment doesn't exist or belongs to a different org → 404.
    notFound();
  }

  // RBAC: only ADMIN + SECRETARY can retry payments. PROFESSIONAL is
  // rejected as read-only (mirrors `changeProfessionalStatus`); PATIENT
  // is defense-in-depth (the dashboard layout already blocks PATIENT
  // from the payments section, but the action enforces the rule
  // anyway so an exposed route cannot bypass the check).
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role;
  const canRoleRetry =
    role === USER_ROLE.ADMIN || role === USER_ROLE.SECRETARY;

  // The retry button is only shown when the user has permission AND
  // the domain rule allows the retry (status not APPROVED, retryCount
  // below the cap).
  const canRetryPayment = canRoleRetry && canRetry(payment);

  return (
    <PaymentDetailCard payment={payment} canRetry={canRetryPayment} />
  );
}
