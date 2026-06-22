/**
 * `PatientEmptyState` — shown when `getPatients` returns an empty
 * array. Renders an illustration + a friendly Spanish message.
 *
 * Marked "use client" because the surrounding `PatientTable` is a
 * Client Component and React 19 still benefits from consistent
 * boundaries. The component itself has no client-side state — it's
 * a pure render.
 */

"use client";

import { Users } from "lucide-react";

export function PatientEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      data-testid="patient-empty-state"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No hay pacientes</p>
        <p className="text-xs text-muted-foreground">
          Cuando crees un paciente, aparecerá acá.
        </p>
      </div>
    </div>
  );
}
