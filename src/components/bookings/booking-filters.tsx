/**
 * `BookingFilters` — URL-driven filter bar for the bookings list page.
 *
 * Filters supported (all map to URL searchParams):
 * - `status` (multi) — checkboxes, one per BookingStatus
 * - `professionalId` (single) — dropdown of professionals offering a service
 * - `serviceId` (single) — dropdown of ACTIVE services
 * - `dateFrom` / `dateTo` (range) — date inputs
 *
 * The component reads its current value from `useSearchParams`, so
 * a deep link to `/dashboard/bookings?status=PENDING` pre-populates
 * the form. On change, the component rebuilds the URL and pushes it
 * via `router.push`, which re-runs the Server Component.
 *
 * The dropdowns are intentionally native `<select>` elements: the
 * shadcn/ui `Select` is not installed in this project, and the
 * spec's filter UX is simple enough that a native picker is the
 * pragmatic choice for PR #3. We can swap to a richer picker later
 * without changing the data flow.
 */

"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import { BOOKING_STATUS_LABEL } from "@/modules/bookings/presentation/formatters";
import type { ProfessionalOption } from "@/modules/bookings/data/booking-data.types";
import type { ServiceOption } from "@/modules/bookings/data/booking-data.types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      router.push(query ? `/dashboard/bookings?${query}` : "/dashboard/bookings");
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
      if (value === "") params.delete("professionalId");
      else params.set("professionalId", value);
    });
  }

  function setService(value: string) {
    commit((params) => {
      if (value === "") params.delete("serviceId");
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

      {/* Dropdowns + date range */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label
            htmlFor="filter-professional"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Profesional
          </label>
          <select
            id="filter-professional"
            value={searchParams.get("professionalId") ?? ""}
            onChange={(e) => setProfessional(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="filter-service"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Servicio
          </label>
          <select
            id="filter-service"
            value={searchParams.get("serviceId") ?? ""}
            onChange={(e) => setService(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <option value="">Todos</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="filter-date-from"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Desde
          </label>
          <Input
            id="filter-date-from"
            type="date"
            value={searchParams.get("dateFrom") ?? ""}
            onChange={(e) => setDateRange("dateFrom", e.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="filter-date-to"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Hasta
          </label>
          <Input
            id="filter-date-to"
            type="date"
            value={searchParams.get("dateTo") ?? ""}
            onChange={(e) => setDateRange("dateTo", e.target.value)}
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
