/**
 * `AnalyticsErrorWrapper` — server-compatible error state.
 *
 * Renders the error message without a retry callback (which requires
 * client interactivity). The retry mechanism is handled by the route
 * entry's Suspense boundary — navigating to the same URL re-triggers
 * the server fetch.
 *
 * Spec: ANP-010 (error state).
 */

import { AlertCircle } from "lucide-react";

export function AnalyticsError() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="analytics-error"
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground">
        Error al cargar las analíticas. Intentá de nuevo.
      </p>
    </div>
  );
}
