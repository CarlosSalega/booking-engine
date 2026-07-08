/**
 * `AnalyticsSkeleton` — loading fallback for the analytics page.
 *
 * Renders 4 KPI card placeholders and chart area placeholders
 * that match the real layout. Used as `<Suspense fallback>` in the
 * route entry so the user sees a stable layout while data streams.
 *
 * Spec: ANP-001 (loading state), ANP-003 (KPI skeleton).
 */

import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div role="status" aria-label="Cargando analíticas" className="space-y-6">
      {/* KPI cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} data-testid="kpi-skeleton" className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} data-testid="chart-skeleton" className="rounded-lg border p-4">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
