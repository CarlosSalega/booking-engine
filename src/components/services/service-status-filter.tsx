/**
 * `ServiceStatusFilter` — a URL-driven status filter for the
 * services list page. Single-value select: Todos / Activo /
 * Inactivo.
 *
 * Updates the URL's `?status=...` parameter via `router.push`,
 * which re-runs the Server Component. The current value is read
 * from `useSearchParams`, so a deep link to
 * `/dashboard/services?status=INACTIVE` pre-populates the filter.
 *
 * Pattern mirrors the patients `PatientStatusFilter`: a single-
 * value select uses the same shadcn-styled native `<select>`
 * element so the filter UX is consistent across modules.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { ServiceStatus, type ServiceStatusType } from "@/modules/services/domain/service";
import { getServiceStatusLabel } from "@/modules/services/presentation/formatters";

export function ServiceStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") ?? "") as ServiceStatusType | "";

  function setStatus(next: ServiceStatusType | "") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "") {
      params.delete("status");
    } else {
      params.set("status", next);
    }
    // Reset pagination when the filter changes.
    params.delete("page");
    const query = params.toString();
    router.push(
      query ? `/dashboard/services?${query}` : "/dashboard/services",
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="service-status-filter"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Estado
      </label>
      <select
        id="service-status-filter"
        value={current}
        onChange={(e) => setStatus(e.target.value as ServiceStatusType | "")}
        data-testid="service-status-filter"
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <option value="">Todos</option>
        <option value={ServiceStatus.ACTIVE}>
          {getServiceStatusLabel(ServiceStatus.ACTIVE)}
        </option>
        <option value={ServiceStatus.INACTIVE}>
          {getServiceStatusLabel(ServiceStatus.INACTIVE)}
        </option>
      </select>
    </div>
  );
}
