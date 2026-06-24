/**
 * `/dashboard/calendar` — operator-facing calendar view.
 *
 * Server Component. Responsibilities (mirrors the bookings list page):
 *
 * 1. **Auth gate.** Resolve the session via `auth.api.getSession`.
 *    Unauthenticated requests are redirected to `/login` (the dashboard
 *    layout already blocks PATIENT users, so this is a defensive
 *    double-check).
 * 2. **Org + RBAC scoping.** Resolve the active org and decide whether
 *    to scope bookings to the session user (PROFESSIONAL) or honor the
 *    URL `professionalId` filter (ADMIN / SECRETARY).
 * 3. **Search params.** Read `date`, `view`, and `professionalId` from
 *    the URL — the calendar is URL-driven (AD3 in design.md) so a
 *    bookmark or share-link reconstructs the exact view.
 * 4. **Data fetch.** `getBookings(orgId, { dateRange, professionalUserId?
 *    , professionalId? })` returns the rows for the visible range.
 * 5. **Serialization.** `startTime` / `endTime` are stringified to ISO
 *    on the RSC boundary (AD5) to avoid silent `Date`-to-string coercion.
 * 6. **Composition.** Render the toolbar (URL sync), the calendar
 *    wrapper (Schedule-X integration), and the empty state when the
 *    range is empty. The data fetch is wrapped in `<Suspense>` so the
 *    toolbar streams immediately while the bookings are still loading.
 *
 * Mobile default view: the calendar wrapper handles the ≤ 768px
 * breakpoint via its own `useMediaQuery` hook and re-renders with
 * `defaultView: "day"`. The page just hands the URL view through.
 */

import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain/roles";
import { getOrganizationId } from "@/modules/dashboard";
import { getBookings } from "@/modules/bookings";
import {
  getProfessionalsForService,
  getServices,
} from "@/modules/bookings/data/booking-data";
import type { BookingFilters } from "@/modules/bookings/data/booking-data.types";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";
import {
  computeDateRange,
  tzArg,
  type CalendarViewName,
} from "@/components/calendar";
import { BookingCalendar } from "@/components/calendar/booking-calendar";
import { BookingCalendarEmpty } from "@/components/calendar/booking-calendar-empty";
import { BookingCalendarToolbar } from "@/components/calendar/booking-calendar-toolbar";

// (The mobile default view — "day" on ≤ 768px viewports — is the
// BookingCalendar wrapper's concern. The page is a Server Component
// and can't read `window`, so the wrapper's `useMediaQuery` hook
// drives the initial-view swap. The page just hands the URL view
// through.)

interface CalendarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ---------------------------------------------------------------------------
// Date helpers (page-local)
// ---------------------------------------------------------------------------

/**
 * Parse a `YYYY-MM-DD` searchParam into a `Temporal.PlainDate`. Falls
 * back to today (in the runtime TZ) when the param is missing or
 * malformed. Lives here so the page is self-contained.
 */
function parseDateParam(raw: string | undefined): Temporal.PlainDate {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return Temporal.PlainDate.from(raw);
  }
  // The runtime TZ is America/Argentina/Buenos_Aires (set in
  // env files), so the wall-clock date matches the user.
  return Temporal.Now.plainDateISO();
}

/**
 * Convert a `Temporal.PlainDate` to a UTC `Date` representing the
 * start of that day in the Argentina time zone. The data layer
 * uses native `Date`s; the page hands the converted range to it.
 */
function plainDateToUTCDate(date: Temporal.PlainDate): Date {
  const zdt = date.toZonedDateTime({
    timeZone: tzArg,
    plainTime: Temporal.PlainTime.from("00:00:00"),
  });
  return new Date(zdt.epochMilliseconds);
}

/**
 * Map the URL `view` param to a `CalendarViewName` for
 * `computeDateRange`. "month" (the URL + Schedule-X name) is
 * treated the same as our internal "month".
 */
function resolveViewName(raw: string | undefined): CalendarViewName {
  if (raw === "day" || raw === "month") return raw;
  return "week";
}

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  // 1. Auth gate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user.role as UserRoleType | undefined) ?? USER_ROLE.PATIENT;
  const userId = session.user.id;
  const organizationId = await getOrganizationId();

  // 2. Read searchParams.
  const params = await searchParams;
  const viewRaw = firstString(params["view"]);
  const viewName = resolveViewName(viewRaw);
  const view = viewName as "week" | "day" | "month";
  const date = parseDateParam(firstString(params["date"]));
  const professionalId = firstString(params["professionalId"]);

  // 3. RBAC scoping — mirrors the bookings list page.
  const isProfessional = role === USER_ROLE.PROFESSIONAL;
  const scopedFilters: BookingFilters = {
    ...(isProfessional && userId
      ? { professionalUserId: userId }
      : professionalId
        ? { professionalId }
        : {}),
  };

  // 4. The default view the calendar wrapper should render with.
  //    The page is a Server Component so it can't read `window` /
  //    use a media-query hook — we hand the URL view through and
  //    let the Client `BookingCalendar` wrapper refine it (e.g.
  //    swap to "day" on a 375px viewport). The wrapper accepts
  //    "week" | "day" | "month-grid" — the Schedule-X names.
  const defaultView: "week" | "day" | "month-grid" =
    view === "month" ? "month-grid" : view;

  return (
    <>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            Vista general de turnos y disponibilidad del equipo.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Suspense fallback={null}>
          <CalendarDataWrapper
            organizationId={organizationId}
            date={date}
            view={view}
            defaultView={defaultView}
            role={role}
            professionalIdFromUrl={professionalId}
            scopedFilters={scopedFilters}
          />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data wrapper — async server component that runs inside <Suspense>
// so the toolbar streams in while the data is still loading.
// ---------------------------------------------------------------------------

interface CalendarDataWrapperProps {
  organizationId: string;
  date: Temporal.PlainDate;
  view: "week" | "day" | "month";
  defaultView: "week" | "day" | "month-grid";
  role: UserRoleType;
  professionalIdFromUrl: string | undefined;
  scopedFilters: BookingFilters;
}

async function CalendarDataWrapper({
  organizationId,
  date,
  view,
  defaultView,
  role,
  professionalIdFromUrl,
  scopedFilters,
}: CalendarDataWrapperProps) {
  // 1. Compute the visible range for the current view.
  const range = computeDateRange(date, view);
  const start = plainDateToUTCDate(range.start);
  const end = plainDateToUTCDate(range.end);

  // 2. Fetch bookings for the range (with the RBAC scoping already
  //    resolved by the parent).
  const result = await getBookings(organizationId, {
    ...scopedFilters,
    dateRange: { start, end },
    // The data layer paginates by default; for the calendar we want
    // every booking in the range, so override pageSize.
    pageSize: 1000,
  });

  // 3. Serialize dates for the RSC boundary.
  const serialized = result.bookings.map((booking) => ({
    ...booking,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
  }));

  // 4. Build the professionals list for the toolbar (admin/secretary only).
  const professionals = role === USER_ROLE.PROFESSIONAL
    ? []
    : await loadProfessionalsForToolbar(organizationId);

  const isEmpty = result.bookings.length === 0;

  return (
    <div className="space-y-4">
      <BookingCalendarToolbar
        view={view}
        date={date.toString()}
        professionalId={professionalIdFromUrl}
        role={role}
        professionals={professionals}
      />

      {isEmpty ? (
        <BookingCalendarEmpty view={view} role={role} />
      ) : (
        <BookingCalendar
          bookings={serialized as unknown as EnrichedBooking[]}
          defaultView={defaultView}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the union of all ACTIVE professionals across the org's
 * services so the toolbar dropdown can show every professional a
 * secretary / admin can scope the calendar to. Mirrors the helper
 * in `app/(dashboard)/dashboard/bookings/page.tsx`.
 */
async function loadProfessionalsForToolbar(organizationId: string) {
  const services = await getServices(organizationId);
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
