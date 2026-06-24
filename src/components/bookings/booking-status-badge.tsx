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
import { STATUS_TONE_CLASS } from "@/modules/bookings/presentation/status-tones";

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
