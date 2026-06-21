/**
 * `/dashboard/bookings` — operator-facing list of all bookings.
 *
 * Server Component. Reads `searchParams` (Next.js 16 still exposes
 * them as a `Promise` in this version of the App Router) and fans
 * out three independent queries in parallel:
 *
 * 1. `getBookings(orgId, filters)` — the table rows.
 * 2. `getServices(orgId)` — the filter dropdown.
 * 3. `getProfessionalsForService(orgId, ...)` — the professional
 *    dropdown. To keep the dropdown simple we union all professionals
 *    across all services.
 *
 * RBAC scoping: when the current user is a PROFESSIONAL, the page
 * passes `professionalUserId: session.user.id` to `getBookings`,
 * which the data layer translates into a `WHERE professional.userId`
 * filter. ADMIN and SECRETARY see every booking.
 *
 * Composition: the page renders the search bar, the filter bar,
 * and a Suspense boundary around the data wrapper. The wrapper
 * does the actual `getBookings` call so the rest of the page
 * (header, search, filters) streams immediately while the table
 * is still loading.
 */

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { headers } from "next/headers";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain/roles";
import { getOrganizationId } from "@/modules/dashboard";
import {
  getBookings,
  getProfessionalsForService,
  getServices,
} from "@/modules/bookings";
import type { BookingFilters as BookingFiltersType, EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import { DEFAULT_PAGE_SIZE } from "@/modules/bookings/data/booking-data.types";

import { Button } from "@/components/ui/button";

import { BookingTable } from "@/components/bookings/booking-table";
import { BookingTableSkeleton } from "@/components/bookings/booking-table-skeleton";
import { BookingFilters as BookingFiltersBar } from "@/components/bookings/booking-filters";
import { BookingSearchBar } from "@/components/bookings/booking-search-bar";

interface BookingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const params = await searchParams;
  const organizationId = await getOrganizationId();
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role;
  const userId = session?.user?.id;

  // Resolve filters from URL once at the top.
  const filters = parseFilters(params);

  // PROFESSIONAL scoping: the data layer receives the user id, no
  // auth import on the data layer side.
  const scopedFilters: BookingFiltersType = {
    ...filters,
    ...(role === USER_ROLE.PROFESSIONAL && userId
      ? { professionalUserId: userId }
      : {}),
  };

  // Pre-fetch filter dropdown data in parallel with the table.
  // We need `services` before we can build the professionals list.
  const services = await getServices(organizationId);
  const professionals = await getProfessionalsForServiceList(
    organizationId,
    services,
  );

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
            <p className="text-sm text-muted-foreground">
              Gestioná los turnos de tu consultorio.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/bookings/new" className="gap-1.5">
              <Plus className="size-4" />
              Nuevo turno
            </Link>
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 lg:px-6">
        <BookingSearchBar />
      </div>

      {/* Filter bar — depends on services + professionals (already loaded above) */}
      <div className="px-4 lg:px-6">
        <BookingFiltersBar professionals={professionals} services={services} />
      </div>

      {/* Table data — Suspense streams the table in once the data resolves */}
      <div className="px-4 lg:px-6">
        <Suspense fallback={<BookingTableSkeleton />}>
          <BookingsTableDataWrapper
            organizationId={organizationId}
            filters={scopedFilters}
          />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data wrapper — async server component that calls getBookings. Lives
// inside <Suspense> so the rest of the page streams while it resolves.
// ---------------------------------------------------------------------------

async function BookingsTableDataWrapper({
  organizationId,
  filters,
}: {
  organizationId: string;
  filters: BookingFiltersType;
}) {
  const result = await getBookings(organizationId, filters);
  return (
    <BookingTable
      bookings={result.bookings as EnrichedBooking[]}
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
 * Resolves the list of professionals to populate the filter dropdown.
 * We want a union of all ACTIVE professionals across all services the
 * org offers. The data layer exposes `getProfessionalsForService(orgId,
 * serviceId)` so we iterate the services and merge.
 */
async function getProfessionalsForServiceList(
  organizationId: string,
  services: { id: string; name: string }[],
) {
  if (services.length === 0) return [];
  const lists = await Promise.all(
    services.map((s) =>
      getProfessionalsForService(organizationId, s.id).catch(() => []),
    ),
  );
  const map = new Map<
    string,
    { id: string; userId: string; user: { name: string }; specialties: string[] }
  >();
  for (const list of lists) {
    for (const prof of list) {
      if (!map.has(prof.id)) {
        map.set(prof.id, prof);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.user.name.localeCompare(b.user.name),
  );
}

/**
 * Parses the URL searchParams into a `BookingFilters` object.
 * - `status` may be repeated (multi-value)
 * - `page` and `pageSize` have defaults
 * - `dateFrom` / `dateTo` are parsed to Date when present
 */
function parseFilters(
  params: Record<string, string | string[] | undefined>,
): BookingFiltersType {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const getAll = (k: string): string[] => {
    const v = params[k];
    return Array.isArray(v) ? v : v === undefined ? [] : [v];
  };

  const pageStr = get("page");
  const pageSizeStr = get("pageSize");
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;
  const pageSize = pageSizeStr
    ? Math.max(1, parseInt(pageSizeStr, 10) || DEFAULT_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const dateFrom = get("dateFrom");
  const dateTo = get("dateTo");
  const dateRange =
    dateFrom || dateTo
      ? {
          start: dateFrom ? new Date(dateFrom) : new Date(0),
          end: dateTo ? new Date(`${dateTo}T23:59:59`) : new Date(8640000000000000),
        }
      : undefined;

  const status = getAll("status").filter(
    (s): s is BookingStatusType => s in BookingStatus,
  );

  return {
    search: get("search"),
    professionalId: get("professionalId"),
    serviceId: get("serviceId"),
    status: status.length > 0 ? status : undefined,
    dateRange,
    page,
    pageSize,
  };
}
