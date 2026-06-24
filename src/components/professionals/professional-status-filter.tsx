/**
 * `ProfessionalStatusFilter` — a URL-driven status filter for the
 * professionals list page. Single-value select: Todos / Activo /
 * Inactivo.
 *
 * Updates the URL's `?status=...` parameter via `router.push`, which
 * re-runs the Server Component. The current value is read from
 * `useSearchParams`, so a deep link to
 * `/dashboard/professionals?status=INACTIVE` pre-populates the filter.
 *
 * Pattern mirrors the services `ServiceStatusFilter`: a single-value
 * select uses the same shadcn-styled native `<select>` element so
 * the filter UX is consistent across modules.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "@/modules/professionals/domain/professional";
import { getProfessionalStatusLabel } from "@/modules/professionals/presentation/formatters";

export function ProfessionalStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") ?? "") as
    | ProfessionalStatusType
    | "";

  function setStatus(next: ProfessionalStatusType | "") {
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
      query
        ? `/dashboard/professionals?${query}`
        : "/dashboard/professionals",
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="professional-status-filter"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Estado
      </label>
      <select
        id="professional-status-filter"
        value={current}
        onChange={(e) =>
          setStatus(e.target.value as ProfessionalStatusType | "")
        }
        data-testid="professional-status-filter"
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <option value="">Todos</option>
        <option value={ProfessionalStatus.ACTIVE}>
          {getProfessionalStatusLabel(ProfessionalStatus.ACTIVE)}
        </option>
        <option value={ProfessionalStatus.INACTIVE}>
          {getProfessionalStatusLabel(ProfessionalStatus.INACTIVE)}
        </option>
      </select>
    </div>
  );
}
