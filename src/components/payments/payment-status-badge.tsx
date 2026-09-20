/**
 * `PaymentStatusBadge` — a small shadcn/ui Badge wrapper that renders
 * a payment's provider status with the right Argentinian Spanish
 * label and the right color variant.
 *
 * The variant map is exported as a constant so the data table tests
 * (and any other consumer that needs to style the badge by status)
 * can import the same source of truth.
 *
 * Color tones (slice 2 / payments-presentation spec):
 * - PENDING    → `--status-pending`        (default variant)
 * - APPROVED   → `--success`               (default variant)
 * - REJECTED   → `--destructive` variant   (no tone — variant paints it)
 * - CANCELLED  → `--status-cancelled`      (secondary variant)
 * - IN_PROCESS → `--info`                 (default variant)
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
 * destructive = red). The color tones are layered on top via
 * `STATUS_TONE_CLASS` so the Argentinian UI uses the same token
 * vocabulary as the rest of the dashboard.
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
 * top of the variant. Every value references a semantic token class
 * defined in `globals.css` (`@theme inline` `--color-*` mapping); no
 * raw palette substrings remain in this file (ui-feedback spec).
 */
const STATUS_TONE_CLASS: Record<ProviderPaymentStatusType, string> = {
  [ProviderPaymentStatus.PENDING]:
    "bg-status-pending/15 text-status-pending-foreground border-status-pending/30",
  [ProviderPaymentStatus.APPROVED]:
    "bg-success/15 text-success-foreground border-success/30",
  [ProviderPaymentStatus.REJECTED]: "",
  [ProviderPaymentStatus.CANCELLED]:
    "bg-status-cancelled/15 text-status-cancelled-foreground border-status-cancelled/30",
  [ProviderPaymentStatus.IN_PROCESS]:
    "bg-info/15 text-info-foreground border-info/30",
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
