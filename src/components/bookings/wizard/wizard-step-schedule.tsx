"use client";

/**
 * `WizardStepSchedule` — step 3 of the booking wizard.
 *
 * Renders a date input plus a grid of available 30-min time slots for
 * the selected (professional, service, date). The user picks a slot,
 * which advances the store's `date`, `startTime`, `endTime`.
 *
 * The slot grid is fetched via the `getAvailableSlotsForWizard` Server
 * Action. The action resolves `organizationId` server-side and runs
 * the same availability logic the createBooking action uses (with the
 * caveat that the transaction inside createBooking is the final
 * arbiter — see `booking-availability.ts`).
 *
 * UX:
 * - Date input is required before slots render.
 * - The selected slot is highlighted.
 * - An empty slots array renders a clear "no hay horarios" message.
 * - The date defaults to "today" on mount (the page passes the
 *   initial value through the store).
 */

import { useEffect, useState } from "react";
import { AlertCircle, Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { getAvailableSlotsForWizard } from "@/modules/bookings/actions";
import type { AvailableSlot } from "@/modules/bookings/data/booking-availability";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WizardStepScheduleProps {
  professionalId: string | null;
  serviceId: string | null;
  /** YYYY-MM-DD, or null. */
  selectedDate: string | null;
  /** HH:MM (24h) start time, or null. */
  selectedStartTime: string | null;
  /** HH:MM (24h) end time, or null. */
  selectedEndTime: string | null;
  /** Called with (date, startTime, endTime) when the user picks a slot. */
  onSelect: (date: string, startTime: string, endTime: string) => void;
  /** Called with (date) whenever the user changes the date input. */
  onDateChange?: (date: string) => void;
}

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; slots: AvailableSlot[] };

function formatHHMM(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function WizardStepSchedule({
  professionalId,
  serviceId,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  onSelect,
  onDateChange,
}: WizardStepScheduleProps) {
  const [state, setState] = useState<FetchState>({ kind: "idle" });

  // Standard data-fetching pattern — see the customer step's
  // comment for the lint suppression rationale.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!professionalId || !serviceId || !selectedDate) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    // Parse the YYYY-MM-DD into a Date at midnight local time.
    const date = new Date(`${selectedDate}T00:00:00`);
    (async () => {
      try {
        const slots = await getAvailableSlotsForWizard(
          professionalId,
          serviceId,
          date,
        );
        if (!cancelled) setState({ kind: "ready", slots });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [professionalId, serviceId, selectedDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!professionalId || !serviceId) return null;

  return (
    <div className="space-y-4" data-wizard-step-schedule>
      {/* Date input */}
      <div className="space-y-1.5">
        <label
          htmlFor="wizard-date"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <CalendarIcon className="size-3.5" />
          Fecha
        </label>
        <Input
          id="wizard-date"
          type="date"
          value={selectedDate ?? ""}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Slot grid */}
      {state.kind === "idle" ? (
        <p className="text-sm text-muted-foreground">
          Elegí una fecha para ver los horarios disponibles.
        </p>
      ) : state.kind === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando horarios…
        </div>
      ) : state.kind === "error" ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <p className="text-destructive">
            No se pudieron cargar los horarios. Probá con otra fecha.
          </p>
        </div>
      ) : state.slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay horarios disponibles para esta fecha. Probá con otra.
        </p>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          data-wizard-step-schedule-slots
        >
          {state.slots.map((slot) => {
            const start = formatHHMM(slot.startTime);
            const end = formatHHMM(slot.endTime);
            const selected = start === selectedStartTime && end === selectedEndTime;
            const label = `${start} – ${end}`;
            return (
              <li key={slot.startTime.toISOString()}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect(selectedDate ?? "", start, end)
                  }
                  aria-pressed={selected}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
