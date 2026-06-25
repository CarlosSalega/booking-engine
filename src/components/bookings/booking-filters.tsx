/**
 * `BookingFilters` — URL-driven filter bar for the bookings list page.
 *
 * Filters supported (all map to URL searchParams):
 * - `status` (multi) — checkboxes, one per BookingStatus
 * - `professionalId` (single) — shadcn Select of professionals
 * - `serviceId` (single) — shadcn Select of ACTIVE services
 * - `dateFrom` / `dateTo` (range) — DateInput (DD/MM/YYYY display)
 *
 * The component reads its current value from `useSearchParams`, so
 * a deep link to `/dashboard/bookings?status=PENDING` pre-populates
 * the form. On change, the component rebuilds the URL and pushes it
 * via `router.push`, which re-runs the Server Component.
 */

"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

import {
  BookingStatus,
  type BookingStatusType,
} from "@/modules/bookings/domain/booking";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/presentation/formatters";
import type { ProfessionalOption } from "@/modules/bookings/data/booking-data.types";
import type { ServiceOption } from "@/modules/bookings/data/booking-data.types";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingFiltersProps {
  professionals: ProfessionalOption[];
  services: ServiceOption[];
}

const ALL_STATUSES: BookingStatusType[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CANCELLED,
  BookingStatus.RESCHEDULED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
  BookingStatus.AWAITING_PAYMENT,
];

const ALL_VALUE = "__all__";

export function BookingFilters({ professionals, services }: BookingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedStatuses = new Set<BookingStatusType>(
    searchParams.getAll("status") as BookingStatusType[],
  );

  const commit = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      // Reset pagination on any filter change.
      params.delete("page");
      const query = params.toString();
      router.push(
        query ? `/dashboard/bookings?${query}` : "/dashboard/bookings",
      );
    },
    [router, searchParams],
  );

  function toggleStatus(status: BookingStatusType) {
    commit((params) => {
      const current = new Set(params.getAll("status") as BookingStatusType[]);
      if (current.has(status)) {
        current.delete(status);
      } else {
        current.add(status);
      }
      params.delete("status");
      for (const s of current) params.append("status", s);
    });
  }

  function setProfessional(value: string) {
    commit((params) => {
      if (value === ALL_VALUE) params.delete("professionalId");
      else params.set("professionalId", value);
    });
  }

  function setService(value: string) {
    commit((params) => {
      if (value === ALL_VALUE) params.delete("serviceId");
      else params.set("serviceId", value);
    });
  }

  function setDateRange(key: "dateFrom" | "dateTo", value: string) {
    commit((params) => {
      if (value === "") params.delete(key);
      else params.set(key, value);
    });
  }

  function clearAll() {
    router.push("/dashboard/bookings");
  }

  const hasActiveFilters =
    selectedStatuses.size > 0 ||
    searchParams.has("professionalId") ||
    searchParams.has("serviceId") ||
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo");

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
      data-testid="booking-filters"
    >
      {/* Status checkboxes */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Estado
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ALL_STATUSES.map((status) => {
            const checked = selectedStatuses.has(status);
            const id = `status-${status}`;
            return (
              <label
                key={status}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStatus(status)}
                  className="size-4 rounded border-input text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                />
                <span>{BOOKING_STATUS_LABEL[status]}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Selects + date range */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Professional */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Profesional
          </span>
          <Select
            value={searchParams.get("professionalId") || ALL_VALUE}
            onValueChange={setProfessional}
          >
            <SelectTrigger
              className="h-8 w-full"
              aria-label="Filtrar por profesional"
              data-testid="filter-professional"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Servicio
          </span>
          <Select
            value={searchParams.get("serviceId") || ALL_VALUE}
            onValueChange={setService}
          >
            <SelectTrigger
              className="h-8 w-full"
              aria-label="Filtrar por servicio"
              data-testid="filter-service"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Desde
          </span>
          <DateInput
            id="filter-date-from"
            value={searchParams.get("dateFrom") ?? ""}
            onChange={(v) => setDateRange("dateFrom", v)}
            className="h-8"
          />
        </div>

        {/* Date to */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hasta
          </span>
          <DateInput
            id="filter-date-to"
            value={searchParams.get("dateTo") ?? ""}
            onChange={(v) => setDateRange("dateTo", v)}
            className="h-8"
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
