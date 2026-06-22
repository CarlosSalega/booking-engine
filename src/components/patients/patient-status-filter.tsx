/**
 * `PatientStatusFilter` — a URL-driven status filter for the patients
 * list page. Single-value select: Todos / Activo / Inactivo / Bloqueado.
 *
 * Updates the URL's `?status=...` parameter via `router.push`, which
 * re-runs the Server Component. The current value is read from
 * `useSearchParams`, so a deep link to `/dashboard/patients?status=
 * BLOCKED` pre-populates the filter.
 *
 * Pattern mirrors the bookings `BookingFilters` (single-value selects
 * use the same shadcn-styled native `<select>` element so the filter
 * UX is consistent across modules).
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { PatientStatus, type PatientStatusType } from "@/modules/patients/domain/patient";
import { getPatientStatusLabel } from "@/modules/patients/presentation/formatters";

export function PatientStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") ?? "") as PatientStatusType | "";

  function setStatus(next: PatientStatusType | "") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "") {
      params.delete("status");
    } else {
      params.set("status", next);
    }
    // Reset pagination when the filter changes.
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/dashboard/patients?${query}` : "/dashboard/patients");
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="patient-status-filter"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Estado
      </label>
      <select
        id="patient-status-filter"
        value={current}
        onChange={(e) => setStatus(e.target.value as PatientStatusType | "")}
        data-testid="patient-status-filter"
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <option value="">Todos</option>
        <option value={PatientStatus.ACTIVE}>
          {getPatientStatusLabel(PatientStatus.ACTIVE)}
        </option>
        <option value={PatientStatus.INACTIVE}>
          {getPatientStatusLabel(PatientStatus.INACTIVE)}
        </option>
        <option value={PatientStatus.BLOCKED}>
          {getPatientStatusLabel(PatientStatus.BLOCKED)}
        </option>
      </select>
    </div>
  );
}
