/**
 * `AnalyticsEmpty` — empty state for no-data date ranges.
 *
 * Shown when all metrics return zero/empty for the selected period.
 * Renders a centered illustration with a descriptive Spanish message.
 *
 * Spec: ANP-009 (empty state).
 */

import { BarChart3 } from "lucide-react";

export function AnalyticsEmpty() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="analytics-empty"
    >
      <div data-testid="analytics-empty-icon" className="mb-4 rounded-full bg-muted p-4">
        <BarChart3 className="size-8 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        No hay datos disponibles para este período.
      </p>
    </div>
  );
}
