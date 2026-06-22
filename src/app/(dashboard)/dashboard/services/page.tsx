/**
 * `/dashboard/services` — operator-facing list of all services.
 *
 * Server Component. Reads `searchParams` (Next.js 16 still exposes
 * them as a `Promise` in this version of the App Router) and fans
 * out a single data fetch in parallel with the page header /
 * filters.
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * data layer (`getServices`) is org-scoped via `getOrganizationId()`,
 * so cross-tenant data never reaches the UI. PROFESSIONAL users see
 * the read-only list (the "Nuevo Servicio" button is hidden for
 * them via the session role check below — AD3).
 *
 * Composition: the page renders the header, the search bar, the
 * status filter, and a Suspense boundary around the data wrapper.
 * The wrapper does the actual `getServices` call so the rest of
 * the page (header, search, filters) streams immediately while the
 * table is still loading. The skeleton is shown during the
 * streaming.
 */

import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus } from "lucide-react";

import { auth } from "@/core/auth";
import { getOrganizationId } from "@/modules/dashboard";
import {
  getServices,
  ServiceStatus,
  type ServiceStatusType,
} from "@/modules/services";
import { USER_ROLE } from "@/modules/auth/domain";
import type { ServiceFilters } from "@/modules/services/data/service-data.types";
import { DEFAULT_PAGE_SIZE } from "@/modules/services/data/service-data.types";

import { Button } from "@/components/ui/button";

import { ServiceTable } from "@/components/services/service-table";
import { ServiceTableSkeleton } from "@/components/services/service-table-skeleton";
import { ServiceSearchBar } from "@/components/services/service-search-bar";
import { ServiceStatusFilter } from "@/components/services/service-status-filter";

interface ServicesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const params = await searchParams;
  const organizationId = await getOrganizationId();
  const filters = parseFilters(params);
  const canCreate = await getCanCreate();

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
            <p className="text-sm text-muted-foreground">
              Gestioná el catálogo de servicios, precios y duraciones.
            </p>
          </div>
          {canCreate ? (
            <Button asChild>
              <Link href="/dashboard/services/new" className="gap-1.5">
                <Plus className="size-4" />
                Nuevo Servicio
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Search bar + status filter */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-4 lg:px-6">
        <ServiceSearchBar />
        <ServiceStatusFilter />
      </div>

      {/* Table data — Suspense streams the table in once the data resolves */}
      <div className="px-4 lg:px-6">
        <Suspense
          key={JSON.stringify(filters)}
          fallback={<ServiceTableSkeleton rows={5} />}
        >
          <ServicesTableDataWrapper
            organizationId={organizationId}
            filters={filters}
          />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data wrapper — async server component that calls getServices. Lives
// inside <Suspense> so the rest of the page streams while it resolves.
// ---------------------------------------------------------------------------

async function ServicesTableDataWrapper({
  organizationId,
  filters,
}: {
  organizationId: string;
  filters: ServiceFilters;
}) {
  const result = await getServices(organizationId, filters);
  return (
    <ServiceTable
      services={result.services}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses the URL searchParams into a `ServiceFilters` object.
 * - `status` is a single string, validated against ServiceStatus values
 * - `page` has a default of 1
 * - `search` is passed through as-is
 */
function parseFilters(
  params: Record<string, string | string[] | undefined>,
): ServiceFilters {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const pageStr = get("page");
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const statusRaw = get("status");
  const validStatuses: ServiceStatusType[] = [
    ServiceStatus.ACTIVE,
    ServiceStatus.INACTIVE,
  ];
  const status =
    statusRaw && (validStatuses as string[]).includes(statusRaw)
      ? (statusRaw as ServiceStatusType)
      : undefined;

  return {
    search: get("search"),
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

/**
 * Returns true if the current session is allowed to create services.
 * The actions themselves enforce this (defense in depth) — this helper
 * is just for hiding the "Nuevo Servicio" button in the UI for
 * read-only roles (PROFESSIONAL).
 */
async function getCanCreate(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;
  const role = session.user.role;
  return role === USER_ROLE.ADMIN || role === USER_ROLE.SECRETARY;
}
