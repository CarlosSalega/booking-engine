"use client";

/**
 * `WizardStepProfessional` — step 2 of the booking wizard.
 *
 * Renders the ACTIVE professionals who offer the previously-selected
 * service. The user picks one, which feeds into step 3 (the schedule).
 *
 * The component re-fetches when `serviceId` changes — returning to
 * step 2 after a service change must clear the previous selection
 * (handled by the store) and re-load the matching professionals.
 */

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, User } from "lucide-react";

import { getProfessionalsForWizard } from "@/modules/bookings/actions";
import type { ProfessionalOption } from "@/modules/bookings/data/booking-data.types";

import { cn } from "@/lib/utils";

interface WizardStepProfessionalProps {
  serviceId: string | null;
  selectedProfessionalId: string | null;
  onSelect: (professionalId: string) => void;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; professionals: ProfessionalOption[] };

export function WizardStepProfessional({
  serviceId,
  selectedProfessionalId,
  onSelect,
}: WizardStepProfessionalProps) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  // Standard data-fetching pattern — see the customer step's
  // comment for the lint suppression rationale.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const professionals = await getProfessionalsForWizard(serviceId);
        if (!cancelled) setState({ kind: "ready", professionals });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // No service selected — return null. The page shouldn't render
  // step 2 without a service, but this is the defensive branch.
  if (!serviceId) return null;

  if (state.kind === "loading") {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        data-wizard-step-professional="loading"
      >
        <Loader2 className="size-4 animate-spin" />
        Cargando profesionales…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        data-wizard-step-professional="error"
      >
        <AlertCircle className="mt-0.5 size-4 text-destructive" />
        <p className="text-destructive">
          No se pudieron cargar los profesionales.
        </p>
      </div>
    );
  }

  if (state.professionals.length === 0) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        data-wizard-step-professional="empty"
      >
        <User className="size-4" />
        No hay profesionales disponibles para este servicio.
      </div>
    );
  }

  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      data-wizard-step-professional="ready"
    >
      {state.professionals.map((prof) => {
        const selected = prof.id === selectedProfessionalId;
        return (
          <li key={prof.id}>
            <button
              type="button"
              onClick={() => onSelect(prof.id)}
              aria-pressed={selected}
              className={cn(
                "flex w-full flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2 text-base font-medium">
                <User
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {prof.user.name}
              </div>
              {prof.specialties.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {prof.specialties.join(" · ")}
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
