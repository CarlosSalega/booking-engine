/**
 * `PaymentStatusBadge` — a small shadcn/ui Badge wrapper that renders
 * a payment's provider status with the right Argentinian Spanish
 * label and the right color variant.
 *
 * The variant map is exported as a constant so the data table tests
 * (and any other consumer that needs to style the badge by status)
 * can import the same source of truth.
 *
 * Color tones (per design AD6):
 * - PENDING    → yellow/amber  (default variant + amber tone)
 * - APPROVED   → green/emerald (default variant + emerald tone)
 * - REJECTED   → red           (destructive variant)
 * - CANCELLED  → gray          (secondary variant)
 * - IN_PROCESS → blue          (default variant + blue tone)
 *
 * The component is marked `"use client"` because the surrounding
 * `PaymentTable` is a Client Component (it owns row click handlers),
 * and React 19 still requires the directive for any component that
 * participates in client rendering.
 */

"use client";

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";
import { getPaymentStatusLabel } from "@/modules/payments/presentation/formatters";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status → shadcn/ui Badge variant. The variant controls the
 * general shape (default = primary tone, secondary = neutral,
 * destructive = red). The color tones (amber, emerald, blue) are
 * layered on top via `STATUS_TONE_CLASS` so the Argentinian UI
 * uses the same color vocabulary as the patients/professionals
 * modules.
 */
export const PAYMENT_STATUS_BADGE_VARIANT: Record<
  ProviderPaymentStatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [ProviderPaymentStatus.PENDING]: "default",
  [ProviderPaymentStatus.APPROVED]: "default",
  [ProviderPaymentStatus.REJECTED]: "destructive",
  [ProviderPaymentStatus.CANCELLED]: "secondary",
  [ProviderPaymentStatus.IN_PROCESS]: "default",
};

/**
 * Status → Tailwind class for the per-status color tone. Layered on
 * top of the variant. Mirrors the patient / professional badge
 * palette (emerald for "good") and adds amber for "pending" and
 * blue for "in process" so the visual vocabulary matches the
 * payment lifecycle.
 */
const STATUS_TONE_CLASS: Record<ProviderPaymentStatusType, string> = {
  [ProviderPaymentStatus.PENDING]:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  [ProviderPaymentStatus.APPROVED]:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [ProviderPaymentStatus.REJECTED]: "",
  [ProviderPaymentStatus.CANCELLED]: "",
  [ProviderPaymentStatus.IN_PROCESS]:
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
};

interface PaymentStatusBadgeProps {
  status: ProviderPaymentStatusType;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variant = PAYMENT_STATUS_BADGE_VARIANT[status];
  const tone = STATUS_TONE_CLASS[status];

  return (
    <Badge variant={variant} className={cn(tone)}>
      {getPaymentStatusLabel(status)}
    </Badge>
  );
}
