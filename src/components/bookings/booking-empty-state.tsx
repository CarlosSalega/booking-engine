/**
 * `BookingEmptyState` — shown when `getBookings` returns an empty
 * array. Renders an illustration + a friendly Spanish message.
 *
 * Marked "use client" because the surrounding `BookingTable` is a
 * Client Component and React 19 still benefits from consistent
 * boundaries. The component itself has no client-side state — it's
 * a pure render.
 */

"use client";

import { CalendarX2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BookingEmptyStateProps {
  /**
   * Optional callback to clear all active filters. When provided,
   * a "Limpiar filtros" button is shown so the user can recover
   * from a filter combination that produced no results.
   */
  onClearFilters?: () => void;
}

export function BookingEmptyState({ onClearFilters }: BookingEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      data-testid="booking-empty-state"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <CalendarX2 className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No se encontraron reservas</p>
        <p className="text-xs text-muted-foreground">
          Probá cambiar los filtros o crear un nuevo turno.
        </p>
      </div>
      {onClearFilters ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearFilters}
        >
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
