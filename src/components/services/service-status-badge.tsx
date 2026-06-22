/**
 * `ServiceStatusBadge` — a small shadcn/ui Badge wrapper that renders
 * a service status with the right Argentinian Spanish label and the
 * right color variant.
 *
 * The variant map is exported as a constant so the data table tests
 * (and any other consumer that needs to style the badge by status)
 * can import the same source of truth.
 *
 * Color tones mirror the patients `PatientStatusBadge` and the
 * bookings `BookingStatusBadge` palettes so the Argentinian UI uses
 * the same color vocabulary across modules:
 * - ACTIVE → default (emerald tone — green in app CSS)
 * - INACTIVE → secondary (gray)
 *
 * The component is marked `"use client"` because the surrounding
 * `ServiceTable` is a Client Component (it owns row click handlers),
 * and React 19 still requires the directive for any component that
 * participates in client rendering.
 */

"use client";

import { ServiceStatus, type ServiceStatusType } from "@/modules/services/domain/service";
import { getServiceStatusLabel } from "@/modules/services/presentation/formatters";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status → shadcn/ui Badge variant. The variant controls the
 * general shape (default = primary, secondary = neutral). The
 * color tones (emerald, gray) are layered on top via
 * `STATUS_TONE_CLASS` so the Argentinian UI uses the same color
 * vocabulary as the patients and bookings modules.
 */
export const SERVICE_STATUS_BADGE_VARIANT: Record<
  ServiceStatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [ServiceStatus.ACTIVE]: "default",
  [ServiceStatus.INACTIVE]: "secondary",
};

/**
 * Status → Tailwind class for the per-status color tone. Layered on
 * top of the variant. Mirrors the patient badge palette so the
 * visual vocabulary is consistent across modules.
 */
const STATUS_TONE_CLASS: Record<ServiceStatusType, string> = {
  [ServiceStatus.ACTIVE]:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [ServiceStatus.INACTIVE]: "",
};

interface ServiceStatusBadgeProps {
  status: ServiceStatusType;
}

export function ServiceStatusBadge({ status }: ServiceStatusBadgeProps) {
  const variant = SERVICE_STATUS_BADGE_VARIANT[status];
  const tone = STATUS_TONE_CLASS[status];

  return (
    <Badge variant={variant} className={cn(tone)}>
      {getServiceStatusLabel(status)}
    </Badge>
  );
}
