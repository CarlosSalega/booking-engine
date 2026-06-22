/**
 * `PatientStatusBadge` — a small shadcn/ui Badge wrapper that renders
 * a patient status with the right Argentinian Spanish label and the
 * right color variant.
 *
 * The variant map is exported as a constant so the data table tests
 * (and any other consumer that needs to style the badge by status)
 * can import the same source of truth.
 *
 * Color tones mirror the bookings `BookingStatusBadge`:
 * - ACTIVE → default (emerald tone — green in app CSS)
 * - INACTIVE → secondary (gray)
 * - BLOCKED → destructive (red)
 *
 * The component is marked `"use client"` because the surrounding
 * `PatientTable` is a Client Component (it owns row click handlers),
 * and React 19 still requires the directive for any component that
 * participates in client rendering.
 */

"use client";

import { PatientStatus, type PatientStatusType } from "@/modules/patients/domain/patient";
import { getPatientStatusLabel } from "@/modules/patients/presentation/formatters";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status → shadcn/ui Badge variant. The variant controls the
 * general shape (default = primary, secondary = neutral, destructive
 * = red). The color tones (emerald, gray, red) are layered on top via
 * `STATUS_TONE_CLASS` so the Argentinian UI uses the same color
 * vocabulary as the bookings module.
 */
export const PATIENT_STATUS_BADGE_VARIANT: Record<
  PatientStatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [PatientStatus.ACTIVE]: "default",
  [PatientStatus.INACTIVE]: "secondary",
  [PatientStatus.BLOCKED]: "destructive",
};

/**
 * Status → Tailwind class for the per-status color tone. Layered on
 * top of the variant. Mirrors the bookings badge palette so the
 * visual vocabulary is consistent across modules.
 */
const STATUS_TONE_CLASS: Record<PatientStatusType, string> = {
  [PatientStatus.ACTIVE]:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [PatientStatus.INACTIVE]: "",
  [PatientStatus.BLOCKED]: "",
};

interface PatientStatusBadgeProps {
  status: PatientStatusType;
}

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  const variant = PATIENT_STATUS_BADGE_VARIANT[status];
  const tone = STATUS_TONE_CLASS[status];

  return (
    <Badge variant={variant} className={cn(tone)}>
      {getPatientStatusLabel(status)}
    </Badge>
  );
}
