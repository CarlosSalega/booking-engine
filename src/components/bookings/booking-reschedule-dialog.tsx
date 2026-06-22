/**
 * `BookingRescheduleDialog` — date + slot picker for the reschedule flow.
 *
 * The "Reprogramar" button on the booking detail page opens this dialog
 * so the user can pick a new date + time slot. The flow:
 *
 *   1. Pick a date (min = today) and click "Buscar horarios".
 *      → calls `getAvailableSlotsForWizard(professionalId, serviceId, date)`
 *   2. Pick a slot from the grid → highlights it.
 *   3. Click "Confirmar reprogramación" → calls
 *      `rescheduleBooking({ bookingId, newStartTime })`.
 *      → on success: toast, close dialog, `router.refresh()`.
 *      → on error: render the action's Spanish error message inline.
 *
 * UX notes:
 * - The dialog's open/close is controlled by the parent
 *   (`BookingDetailActions`) so the trigger button stays where the
 *   page layout expects it.
 * - The dialog resets its internal state every time it opens, so the
 *   user never sees stale slots from a previous run.
 * - All UI copy is in Argentinian Spanish, matching the rest of the
 *   bookings module.
 *
 * Why a Client Component: needs `useState` for the date / slot
 * selection, `useTransition`-style loading flags, and Server Action
 * calls. The Server Action boundary is the only network touch point;
 * the data fn (`getAvailableSlotsForWizard`) and the mutation
 * (`rescheduleBooking`) are both defined in `@/modules/bookings/actions`.
 */

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, Calendar as CalendarIcon, Loader2 } from "lucide-react";

import {
  getAvailableSlotsForWizard,
  rescheduleBooking,
} from "@/modules/bookings/actions";
import type { AvailableSlot } from "@/modules/bookings/data/booking-data.types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BookingRescheduleDialogProps {
  /** Booking being rescheduled. */
  bookingId: string;
  /** Professional assigned to the booking (slot search is per-professional). */
  professionalId: string;
  /** Service the booking is for (drives the slot length). */
  serviceId: string;
  /** Controlled open state — owned by the parent action bar. */
  open: boolean;
  /** Notify the parent when the user dismisses the dialog. */
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Local-time HH:MM used in slot button labels. */
function formatHHMM(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Today's date as `YYYY-MM-DD` for the date input's `min` attribute. */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingRescheduleDialog({
  bookingId,
  professionalId,
  serviceId,
  open,
  onOpenChange,
}: BookingRescheduleDialogProps) {
  const router = useRouter();
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Form state — each field is independent so a new search resets only
  // the slot grid (not the date the user picked).
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Fetch / search state
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reschedule error from the server action — shown inline so the
  // user can retry without losing their date/slot selection.
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Every time the dialog re-opens we reset the internal form so a
  // previous (failed) run doesn't leak its state into the next one.
  // The lint rule treats this as "setState in effect", but the intent
  // is exactly the documented escape hatch (syncing React state to an
  // external system — the parent's controlled `open` prop). Mirrors
  // the same disable pattern used in `wizard-step-schedule.tsx`.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setSelectedDate("");
    setAvailableSlots([]);
    setSelectedSlot(null);
    setHasSearched(false);
    setSearchError(null);
    setSubmitError(null);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSearch() {
    if (!selectedDate) return;
    setSearchError(null);
    setSubmitError(null);
    // New search invalidates the previously chosen slot — the new grid
    // is a different day, so the old startTime cannot be in it.
    setSelectedSlot(null);
    startSearchTransition(() => {
      void (async () => {
        try {
          const date = new Date(`${selectedDate}T00:00:00`);
          const slots = await getAvailableSlotsForWizard(
            professionalId,
            serviceId,
            date,
          );
          setAvailableSlots(slots);
          setHasSearched(true);
        } catch {
          setSearchError(
            "No se pudieron cargar los horarios disponibles. Intentá de nuevo.",
          );
        }
      })();
    });
  }

  function handleConfirm() {
    if (!selectedSlot) return;
    setSubmitError(null);
    startSubmitTransition(() => {
      void (async () => {
        try {
          const result = await rescheduleBooking({
            bookingId,
            newStartTime: selectedSlot.startTime,
          });
          if (result.success) {
            toast.success("Turno reprogramado");
            onOpenChange(false);
            router.refresh();
            return;
          }
          setSubmitError(result.error);
        } catch {
          setSubmitError(
            "No se pudo reprogramar el turno. Intentá de nuevo.",
          );
        }
      })();
    });
  }

  const today = todayISO();
  const isBusy = isSearching || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="booking-reschedule-dialog"
      >
        <DialogHeader>
          <DialogTitle>Reprogramar turno</DialogTitle>
          <DialogDescription>
            Seleccioná una nueva fecha y horario para el turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date input + search trigger */}
          <div className="space-y-1.5">
            <label
              htmlFor="reschedule-date"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <CalendarIcon className="size-3.5" />
              Fecha
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="reschedule-date"
                type="date"
                value={selectedDate}
                min={today}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  // Changing the date invalidates the previous search
                  // result so the user doesn't accidentally confirm a
                  // slot that no longer matches the chosen date.
                  setHasSearched(false);
                  setAvailableSlots([]);
                  setSelectedSlot(null);
                  setSearchError(null);
                }}
                disabled={isBusy}
                className="sm:max-w-[14rem]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={!selectedDate || isBusy}
                data-testid="reschedule-search-button"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Buscando…
                  </>
                ) : (
                  "Buscar horarios"
                )}
              </Button>
            </div>
          </div>

          {/* Slot grid OR loading / error / empty / idle state */}
          {searchError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
              data-testid="reschedule-search-error"
            >
              <AlertCircle className="mt-0.5 size-4 text-destructive" />
              <p className="text-destructive">{searchError}</p>
            </div>
          ) : isSearching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Buscando horarios disponibles…
            </div>
          ) : hasSearched ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Horarios disponibles</p>
              {availableSlots.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="reschedule-empty-slots"
                >
                  No hay horarios disponibles para esta fecha.
                </p>
              ) : (
                <ul
                  role="list"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  data-testid="reschedule-slot-grid"
                >
                  {availableSlots.map((slot) => {
                    const start = formatHHMM(slot.startTime);
                    const end = formatHHMM(slot.endTime);
                    const isSelected = selectedSlot === slot;
                    const label = `${start} – ${end}`;
                    return (
                      <li key={slot.startTime.toISOString()}>
                        <button
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          disabled={isSubmitting}
                          aria-pressed={isSelected}
                          data-testid="reschedule-slot-button"
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors",
                            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
                            "disabled:pointer-events-none disabled:opacity-50",
                            isSelected
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
          ) : (
            <p className="text-sm text-muted-foreground">
              Elegí una fecha y pulsá &quot;Buscar horarios&quot; para ver los
              turnos disponibles.
            </p>
          )}

          {/* Selected-slot hint — small, low-noise reminder of what's
              about to be confirmed. */}
          {selectedSlot ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="reschedule-selected-hint"
            >
              Horario seleccionado: {formatHHMM(selectedSlot.startTime)} -{" "}
              {formatHHMM(selectedSlot.endTime)}
            </p>
          ) : null}

          {/* Server-action error — rendered after the slot grid so the
              user keeps their selection and can retry without picking
              a new date. */}
          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
              data-testid="reschedule-submit-error"
            >
              <AlertCircle className="mt-0.5 size-4 text-destructive" />
              <p className="text-destructive">{submitError}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              data-testid="reschedule-cancel-button"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || isBusy}
            data-testid="reschedule-confirm-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Reprogramando…
              </>
            ) : (
              "Confirmar reprogramación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
