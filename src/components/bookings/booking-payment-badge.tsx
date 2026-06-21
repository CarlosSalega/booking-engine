/**
 * `BookingPaymentBadge` — small shadcn/ui Badge wrapper for the
 * payment status of a booking. Renders the Argentinian Spanish
 * label + the right color variant.
 *
 * Mirrors the structure of `BookingStatusBadge` so the two badges
 * read identically in the table. The variant map is exported so
 * other consumers (table, detail page) can reference the same
 * source of truth.
 */

"use client";

import {
  PaymentStatus,
  type PaymentStatusType,
} from "@/modules/services/domain";
import { formatPaymentStatus } from "@/modules/bookings/presentation/formatters";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const BOOKING_PAYMENT_BADGE_VARIANT: Record<
  PaymentStatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [PaymentStatus.PAID]: "default",
  [PaymentStatus.PENDING]: "outline",
  [PaymentStatus.FAILED]: "destructive",
  [PaymentStatus.REFUNDED]: "secondary",
  [PaymentStatus.PARTIALLY_REFUNDED]: "secondary",
};

const PAYMENT_TONE_CLASS: Record<PaymentStatusType, string> = {
  [PaymentStatus.PAID]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [PaymentStatus.PENDING]: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  [PaymentStatus.FAILED]: "",
  [PaymentStatus.REFUNDED]: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  [PaymentStatus.PARTIALLY_REFUNDED]: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

interface BookingPaymentBadgeProps {
  status: PaymentStatusType;
}

export function BookingPaymentBadge({ status }: BookingPaymentBadgeProps) {
  const variant = BOOKING_PAYMENT_BADGE_VARIANT[status];
  const tone = PAYMENT_TONE_CLASS[status];

  return (
    <Badge variant={variant} className={cn(tone)}>
      {formatPaymentStatus(status)}
    </Badge>
  );
}
