/**
 * `/dashboard/patients` — operator-facing list of all patients.
 *
 * Server Component. Reads `searchParams` (Next.js 16 still exposes
 * them as a `Promise` in this version of the App Router) and fans
 * out a single data fetch in parallel with the page header / filters.
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * data layer (`getPatients`) is org-scoped via `getOrganizationId()`,
 * so cross-tenant data never reaches the UI.
 *
 * Composition: the page renders the header, the search bar, the
 * status filter, and a Suspense boundary around the data wrapper.
 * The wrapper does the actual `getPatients` call so the rest of the
 * page (header, search, filters) streams immediately while the
 * table is still loading. The skeleton is shown during the
 * streaming.
 */

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getOrganizationId } from "@/modules/dashboard";
import {
  getPatients,
  PatientStatus,
  type PatientStatusType,
} from "@/modules/patients";
import type { EnrichedPatient, PatientFilters } from "@/modules/patients/data/patient-data.types";
import { DEFAULT_PAGE_SIZE } from "@/modules/patients/data/patient-data.types";

import { Button } from "@/components/ui/button";

import { PatientTable } from "@/components/patients/patient-table";
import { PatientTableSkeleton } from "@/components/patients/patient-table-skeleton";
import { PatientSearchBar } from "@/components/patients/patient-search-bar";
import { PatientStatusFilter } from "@/components/patients/patient-status-filter";

interface PatientsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const params = await searchParams;
  const organizationId = await getOrganizationId();
  const filters = parseFilters(params);

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestioná los pacientes de tu consultorio.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/patients/new" className="gap-1.5">
              <Plus className="size-4" />
              Nuevo Paciente
            </Link>
          </Button>
        </div>
      </div>

      {/* Search bar + status filter */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-4 lg:px-6">
        <PatientSearchBar />
        <PatientStatusFilter />
      </div>

      {/* Table data — Suspense streams the table in once the data resolves */}
      <div className="px-4 lg:px-6">
        <Suspense
          key={JSON.stringify(filters)}
          fallback={<PatientTableSkeleton rows={5} />}
        >
          <PatientsTableDataWrapper
            organizationId={organizationId}
            filters={filters}
          />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data wrapper — async server component that calls getPatients. Lives
// inside <Suspense> so the rest of the page streams while it resolves.
// ---------------------------------------------------------------------------

async function PatientsTableDataWrapper({
  organizationId,
  filters,
}: {
  organizationId: string;
  filters: PatientFilters;
}) {
  const result = await getPatients(organizationId, filters);
  return (
    <PatientTable
      patients={result.patients as EnrichedPatient[]}
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
 * Parses the URL searchParams into a `PatientFilters` object.
 * - `status` is a single string, validated against PatientStatus values
 * - `page` has a default of 1
 * - `search` is passed through as-is
 */
function parseFilters(
  params: Record<string, string | string[] | undefined>,
): PatientFilters {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const pageStr = get("page");
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const statusRaw = get("status");
  const validStatuses: PatientStatusType[] = [
    PatientStatus.ACTIVE,
    PatientStatus.INACTIVE,
    PatientStatus.BLOCKED,
  ];
  const status =
    statusRaw && (validStatuses as string[]).includes(statusRaw)
      ? (statusRaw as PatientStatusType)
      : undefined;

  return {
    search: get("search"),
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}
