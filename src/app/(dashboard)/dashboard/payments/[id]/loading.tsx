/**
 * Loading skeleton for `/dashboard/payments/[id]`.
 *
 * The page fetches session + orgId + `getPaymentById()`.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentDetailLoading() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-7 w-48" />
      </div>

      {/* Detail card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
