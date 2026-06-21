"use client";

/**
 * `WizardStepService` — the first step of the booking wizard.
 *
 * Renders the org's ACTIVE services as a list of selectable cards
 * (name, duration, price). On click, the parent page updates the
 * Zustand store and the user can advance to step 2.
 *
 * Data is fetched on mount via the `getServicesForWizard` Server
 * Action. The action resolves `organizationId` server-side, so the
 * component doesn't need to know which org is active.
 *
 * The component owns three render states:
 * - `loading` (data hasn't resolved yet) — spinner + "Cargando".
 * - `error` (the action threw) — error icon + "No se pudieron cargar
 *   los servicios".
 * - `empty` (data resolved to `[]`) — "No hay servicios disponibles".
 * - `ready` (data resolved to non-empty list) — service cards.
 */

import { useEffect, useState } from "react";
import { AlertCircle, Clock, Loader2, Stethoscope } from "lucide-react";

import {
  getServicesForWizard,
} from "@/modules/bookings/actions";
import { formatCurrency } from "@/modules/bookings/presentation/formatters";
import type { ServiceOption } from "@/modules/bookings/data/booking-data.types";

import { cn } from "@/lib/utils";

interface WizardStepServiceProps {
  /** The currently selected service id (or null). Used for highlighting. */
  selectedServiceId: string | null;
  /** Called with the new service id when the user picks a service. */
  onSelect: (serviceId: string) => void;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; services: ServiceOption[] };

export function WizardStepService({
  selectedServiceId,
  onSelect,
}: WizardStepServiceProps) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const services = await getServicesForWizard();
        if (!cancelled) setState({ kind: "ready", services });
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los servicios.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        data-wizard-step-service="loading"
      >
        <Loader2 className="size-4 animate-spin" />
        Cargando servicios…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        data-wizard-step-service="error"
      >
        <AlertCircle className="mt-0.5 size-4 text-destructive" />
        <p className="text-destructive">No se pudieron cargar los servicios.</p>
      </div>
    );
  }

  if (state.services.length === 0) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        data-wizard-step-service="empty"
      >
        <Stethoscope className="size-4" />
        No hay servicios disponibles en este momento.
      </div>
    );
  }

  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      data-wizard-step-service="ready"
    >
      {state.services.map((service) => {
        const selected = service.id === selectedServiceId;
        return (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => onSelect(service.id)}
              aria-pressed={selected}
              className={cn(
                "flex w-full flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-base font-medium">{service.name}</span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(service.price)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" />
                <span className="tabular-nums">
                  {service.durationMinutes} min
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
