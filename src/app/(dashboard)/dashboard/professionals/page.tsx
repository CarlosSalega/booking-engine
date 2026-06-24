/**
 * `/dashboard/professionals` — operator-facing list of all professionals.
 *
 * Server Component. Reads `searchParams` (Next.js 16 still exposes
 * them as a `Promise` in this version of the App Router) and fans
 * out a single data fetch in parallel with the page header / filters.
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * data layer (`getProfessionals`) is org-scoped via
 * `getOrganizationId()`, so cross-tenant data never reaches the UI.
 * PROFESSIONAL users see the read-only list (the "Nuevo Profesional"
 * button is hidden for them via the session role check below — AD2).
 *
 * Composition: the page renders the header, the search bar, the
 * status filter, and a Suspense boundary around the data wrapper.
 * The wrapper does the actual `getProfessionals` call so the rest of
 * the page (header, search, filters) streams immediately while the
 * table is still loading. The skeleton is shown during the streaming.
 */

import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus } from "lucide-react";

import { auth } from "@/core/auth";
import { getOrganizationId } from "@/modules/dashboard";
import {
  getProfessionals,
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "@/modules/professionals";
import { USER_ROLE } from "@/modules/auth/domain";
import type { ProfessionalFilters } from "@/modules/professionals/data/professional-data.types";
import { DEFAULT_PAGE_SIZE } from "@/modules/professionals/data/professional-data.types";

import { Button } from "@/components/ui/button";

import { ProfessionalTable } from "@/components/professionals/professional-table";
import { ProfessionalTableSkeleton } from "@/components/professionals/professional-table-skeleton";
import { ProfessionalSearchBar } from "@/components/professionals/professional-search-bar";
import { ProfessionalStatusFilter } from "@/components/professionals/professional-status-filter";

interface ProfessionalsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfessionalsPage({
  searchParams,
}: ProfessionalsPageProps) {
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
            <h1 className="text-2xl font-semibold tracking-tight">
              Profesionales
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestioná el equipo de profesionales, especialidades y
              matrículas.
            </p>
          </div>
          {canCreate ? (
            <Button asChild>
              <Link href="/dashboard/professionals/new" className="gap-1.5">
                <Plus className="size-4" />
                Nuevo Profesional
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Search bar + status filter */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-4 lg:px-6">
        <ProfessionalSearchBar />
        <ProfessionalStatusFilter />
      </div>

      {/* Table data — Suspense streams the table in once the data resolves */}
      <div className="px-4 lg:px-6">
        <Suspense
          key={JSON.stringify(filters)}
          fallback={<ProfessionalTableSkeleton rows={5} />}
        >
          <ProfessionalsTableDataWrapper
            organizationId={organizationId}
            filters={filters}
          />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data wrapper — async server component that calls getProfessionals. Lives
// inside <Suspense> so the rest of the page streams while it resolves.
// ---------------------------------------------------------------------------

async function ProfessionalsTableDataWrapper({
  organizationId,
  filters,
}: {
  organizationId: string;
  filters: ProfessionalFilters;
}) {
  const result = await getProfessionals(organizationId, filters);
  return (
    <ProfessionalTable
      professionals={result.professionals}
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
 * Parses the URL searchParams into a `ProfessionalFilters` object.
 * - `status` is a single string, validated against ProfessionalStatus values
 * - `page` has a default of 1
 * - `search` is passed through as-is
 */
function parseFilters(
  params: Record<string, string | string[] | undefined>,
): ProfessionalFilters {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const pageStr = get("page");
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const statusRaw = get("status");
  const validStatuses: ProfessionalStatusType[] = [
    ProfessionalStatus.ACTIVE,
    ProfessionalStatus.INACTIVE,
  ];
  const status =
    statusRaw && (validStatuses as string[]).includes(statusRaw)
      ? (statusRaw as ProfessionalStatusType)
      : undefined;

  return {
    search: get("search"),
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

/**
 * Returns true if the current session is allowed to create professionals.
 * The actions themselves enforce this (defense in depth) — this helper
 * is just for hiding the "Nuevo Profesional" button in the UI for
 * read-only roles (PROFESSIONAL).
 */
async function getCanCreate(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;
  const role = session.user.role;
  return role === USER_ROLE.ADMIN || role === USER_ROLE.SECRETARY;
}
