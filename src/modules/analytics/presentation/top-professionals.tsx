/**
 * `TopProfessionals` — ranked list of top professionals by booking count.
 *
 * Server Component that shows up to 5 professionals with their booking
 * count, revenue formatted in ARS, and occupancy percentage.
 *
 * Spec: ANP-007 (top professionals list), ANP-008 (filter visibility).
 */

import { formatCurrency } from "@/modules/dashboard/presentation/formatters";

import type { ProfessionalMetric } from "../domain/types";

const MAX_ITEMS = 5;

interface TopProfessionalsProps {
  data: ProfessionalMetric[];
}

export function TopProfessionals({ data }: TopProfessionalsProps) {
  const items = data.slice(0, MAX_ITEMS);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-lg font-semibold">Profesionales más activos</h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay profesionales con actividad en este período.
        </p>
      ) : (
        <ol className="space-y-3">
          {items.map((prof, index) => {
            const occupancyPercent = Math.round(prof.occupancyRate * 100);

            return (
              <li
                key={prof.professionalUserId}
                data-testid={`top-professional-${index + 1}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="font-medium">{prof.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {prof.count} reservas
                  </span>
                  <span className="font-medium">{formatCurrency(prof.revenue)}</span>
                  <span className="text-muted-foreground">{occupancyPercent}%</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
