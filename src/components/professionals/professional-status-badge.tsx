/**
 * `ProfessionalStatusBadge` — a small shadcn/ui Badge wrapper that
 * renders a professional status with the right Argentinian Spanish
 * label and the right color variant.
 *
 * The variant map is exported as a constant so the data table tests
 * (and any other consumer that needs to style the badge by status)
 * can import the same source of truth.
 *
 * Color tones mirror the services `ServiceStatusBadge` and the
 * patients `PatientStatusBadge` palettes so the Argentinian UI uses
 * the same color vocabulary across modules:
 * - ACTIVE   → default (emerald tone — green in app CSS)
 * - INACTIVE → secondary (gray)
 *
 * The component is marked `"use client"` because the surrounding
 * `ProfessionalTable` is a Client Component (it owns row click
 * handlers), and React 19 still requires the directive for any
 * component that participates in client rendering.
 */

"use client";

import {
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "@/modules/professionals/domain/professional";
import { getProfessionalStatusLabel } from "@/modules/professionals/presentation/formatters";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status → shadcn/ui Badge variant. The variant controls the
 * general shape (default = primary, secondary = neutral). The
 * color tones (emerald, gray) are layered on top via
 * `STATUS_TONE_CLASS` so the Argentinian UI uses the same color
 * vocabulary as the services and patients modules.
 */
export const PROFESSIONAL_STATUS_BADGE_VARIANT: Record<
  ProfessionalStatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [ProfessionalStatus.ACTIVE]: "default",
  [ProfessionalStatus.INACTIVE]: "secondary",
};

/**
 * Status → Tailwind class for the per-status color tone. Layered on
 * top of the variant. Mirrors the service / patient badge palette so
 * the visual vocabulary is consistent across modules.
 */
const STATUS_TONE_CLASS: Record<ProfessionalStatusType, string> = {
  [ProfessionalStatus.ACTIVE]:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  [ProfessionalStatus.INACTIVE]: "",
};

interface ProfessionalStatusBadgeProps {
  status: ProfessionalStatusType;
}

export function ProfessionalStatusBadge({
  status,
}: ProfessionalStatusBadgeProps) {
  const variant = PROFESSIONAL_STATUS_BADGE_VARIANT[status];
  const tone = STATUS_TONE_CLASS[status];

  return (
    <Badge variant={variant} className={cn(tone)}>
      {getProfessionalStatusLabel(status)}
    </Badge>
  );
}
