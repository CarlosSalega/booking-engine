/**
 * `PaymentStatusFilter` — a URL-driven status filter for the payments
 * list page. Single-value select: Todos / Pendiente / Aprobado /
 * Rechazado / Cancelado / En proceso.
 *
 * Updates the URL's `?status=...` parameter via `router.push`, which
 * re-runs the Server Component. The current value is read from
 * `useSearchParams`, so a deep link to
 * `/dashboard/payments?status=REJECTED` pre-populates the filter.
 *
 * Pattern mirrors the patients `PatientStatusFilter`: a single-value
 * select uses the same shadcn-styled native `<select>` element so
 * the filter UX is consistent across modules.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";
import { getPaymentStatusLabel } from "@/modules/payments/presentation/formatters";

export function PaymentStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") ?? "") as
    | ProviderPaymentStatusType
    | "";

  function setStatus(next: ProviderPaymentStatusType | "") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "") {
      params.delete("status");
    } else {
      params.set("status", next);
    }
    // Reset pagination when the filter changes.
    params.delete("page");
    const query = params.toString();
    router.push(
      query ? `/dashboard/payments?${query}` : "/dashboard/payments",
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="payment-status-filter"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Estado
      </label>
      <select
        id="payment-status-filter"
        value={current}
        onChange={(e) =>
          setStatus(e.target.value as ProviderPaymentStatusType | "")
        }
        data-testid="payment-status-filter"
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <option value="">Todos</option>
        <option value={ProviderPaymentStatus.PENDING}>
          {getPaymentStatusLabel(ProviderPaymentStatus.PENDING)}
        </option>
        <option value={ProviderPaymentStatus.APPROVED}>
          {getPaymentStatusLabel(ProviderPaymentStatus.APPROVED)}
        </option>
        <option value={ProviderPaymentStatus.REJECTED}>
          {getPaymentStatusLabel(ProviderPaymentStatus.REJECTED)}
        </option>
        <option value={ProviderPaymentStatus.CANCELLED}>
          {getPaymentStatusLabel(ProviderPaymentStatus.CANCELLED)}
        </option>
        <option value={ProviderPaymentStatus.IN_PROCESS}>
          {getPaymentStatusLabel(ProviderPaymentStatus.IN_PROCESS)}
        </option>
      </select>
    </div>
  );
}
