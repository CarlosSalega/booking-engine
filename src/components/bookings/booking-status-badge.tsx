/**
 * `BookingStatusBadge` — a small shadcn/ui Badge wrapper that renders
 * a booking status with the right Argentinian Spanish label and the
 * right color variant.
 *
 * The variant map is exported as a constant so the data table tests
 * (and any other consumer that needs to style the badge by status)
 * can import the same source of truth.
 *
 * Color tones are applied via the `className` prop on top of the
 * `variant` — shadcn's `Badge` exposes `data-variant` so a parent
 * selector could also style the badge, but inline classes are easier
 * to debug in DevTools and don't require an additional CSS file.
 *
 * The component is marked `"use client"` because the surrounding
 * `BookingTable` is a Client Component (it owns row click handlers),
 * and React 19 still requires the directive for any component that
 * participates in client rendering.
 */

"use client";

import {
  BookingStatus,
  type BookingStatusType,
} from "@/modules/bookings/domain/booking";
import { getBookingStatusLabel } from "@/modules/bookings/presentation/formatters";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status → shadcn/ui Badge variant. The variant controls the
 * general shape (default = primary, secondary = neutral, destructive
 * = red, outline = bordered). The color tones (amber, emerald, sky,
 * violet) are layered on top via `STATUS_TONE_CLASS` so the
 * Argentinian UI can use the same color vocabulary as the dashboard.
 */
export const BOOKING_STATUS_BADGE_VARIANT: Record<
  BookingStatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [BookingStatus.PENDING]: "outline",
  [BookingStatus.CONFIRMED]: "default",
  [BookingStatus.CANCELLED]: "destructive",
  [BookingStatus.RESCHEDULED]: "secondary",
  [BookingStatus.COMPLETED]: "default",
  [BookingStatus.NO_SHOW]: "destructive",
  [BookingStatus.AWAITING_PAYMENT]: "outline",
};

/**
 * Status → Tailwind class for the per-status color tone. Layered on
 * top of the variant. Mirrors the dashboard's `today-bookings.tsx`
 * so the visual vocabulary is consistent across modules.
 */
const STATUS_TONE_CLASS: Record<BookingStatusType, string> = {
  [BookingStatus.PENDING]: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  [BookingStatus.CONFIRMED]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [BookingStatus.CANCELLED]: "",
  [BookingStatus.RESCHEDULED]: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  [BookingStatus.COMPLETED]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  [BookingStatus.NO_SHOW]: "",
  [BookingStatus.AWAITING_PAYMENT]: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
};

interface BookingStatusBadgeProps {
  status: BookingStatusType;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const variant = BOOKING_STATUS_BADGE_VARIANT[status];
  const tone = STATUS_TONE_CLASS[status];

  return (
    <Badge
      variant={variant}
      className={cn(tone)}
    >
      {getBookingStatusLabel(status)}
    </Badge>
  );
}
