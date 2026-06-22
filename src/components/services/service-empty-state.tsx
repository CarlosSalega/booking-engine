/**
 * `ServiceEmptyState` — shown when `getServices` returns an empty
 * array. Renders an illustration + a friendly Spanish message.
 *
 * Marked "use client" because the surrounding `ServiceTable` is a
 * Client Component and React 19 still benefits from consistent
 * boundaries. The component itself has no client-side state — it's
 * a pure render.
 */

"use client";

import { Wrench } from "lucide-react";

export function ServiceEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      data-testid="service-empty-state"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Wrench className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No hay servicios</p>
        <p className="text-xs text-muted-foreground">
          Cuando crees un servicio, aparecerá acá.
        </p>
      </div>
    </div>
  );
}
