"use server";

/**
 * getCalendarBookings — calendar-specific data loader.
 *
 * Server Action called from the `BookingCalendar` client wrapper's
 * `onRangeUpdate` callback (PR #2) and from the Server Component
 * page on initial render. Returns the same `EnrichedBooking` shape
 * the rest of the bookings module consumes, but with the date
 * fields pre-serialized to ISO strings so the value can flow
 * straight through the RSC boundary to a Client Component without
 * a silent `Date → string` coercion.
 *
 * RBAC scoping mirrors the bookings list page (`/dashboard/bookings`):
 *   - PROFESSIONAL → `professionalUserId` is forced to the session
 *     user id. The URL param is IGNORED — a professional cannot
 *     spy on a colleague's calendar by editing the URL.
 *   - ADMIN / SECRETARY → the optional URL `professionalId` is
 *     forwarded to the data layer (the toolbar dropdown sets it
 *     when the operator narrows the calendar to one professional).
 *
 * Unlike the bookings list Server Component, this action does NOT
 * revalidate any path — the calendar is a pure view and the data
 * is fetched imperatively by the wrapper. `revalidatePath` is the
 * wrong tool here.
 */

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/core/auth";
import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getBookings } from "@/modules/bookings/data/booking-data";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

// ---------------------------------------------------------------------------
// Input schema — Zod 4 with `error` param.
// ---------------------------------------------------------------------------

/**
 * Zod schema for the action's input. The `dateRange` carries the
 * visible window the calendar wants to refetch. The optional
 * `professionalId` mirrors the URL searchParam.
 */
const dateRangeSchema = z.object({
  dateRange: z.object({
    start: z.iso.datetime({
      error: "Fecha de inicio del rango inválida",
    }),
    end: z.iso.datetime({
      error: "Fecha de fin del rango inválida",
    }),
  }),
  professionalId: z
    .uuid({ error: "ID de profesional inválido" })
    .optional(),
});

export type GetCalendarBookingsInput = z.infer<typeof dateRangeSchema>;

/**
 * The shape we return to the client. The dates are ISO strings —
 * the rest of the `EnrichedBooking` payload is forwarded as-is
 * (it is already serializable: `null` for the optional patient,
 * plain objects for the rest).
 */
export type SerializedEnrichedBooking = Omit<EnrichedBooking, "startTime" | "endTime"> & {
  startTime: string;
  endTime: string;
};

// ---------------------------------------------------------------------------
// getCalendarBookings
// ---------------------------------------------------------------------------

/**
 * Load the bookings that fall inside the visible date range, with
 * RBAC scoping applied server-side. Dates are serialized to ISO
 * strings on the way out.
 *
 * Always returns an array — never throws. The popover treats an
 * empty array the same as no refresh (the previous bookings stay
 * on screen until the next successful fetch).
 */
export async function getCalendarBookings(
  input: GetCalendarBookingsInput,
): Promise<SerializedEnrichedBooking[]> {
  // 1. Zod 4 validation — invalid shapes silently degrade to an
  //    empty array so a misbehaving client never crashes the page.
  const parsed = dateRangeSchema.safeParse(input);
  if (!parsed.success) {
    return [];
  }

  // 2. Auth: get session + organization. The dashboard layout
  //    already gates unauthenticated users, but we double-check
  //    so the action is safe to call from anywhere.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return [];
  }

  const role = session.user.role as UserRoleType;
  const userId = session.user.id;
  const organizationId = await getOrganizationId();

  // 3. RBAC scoping.
  const { dateRange, professionalId } = parsed.data;
  const isProfessional = role === USER_ROLE.PROFESSIONAL;

  // PROFESSIONAL → scoped to their own user id; URL param is
  // ignored. ADMIN/SECRETARY → the URL param is forwarded verbatim
  // (or omitted when the operator chose "Todos los profesionales").
  const scopedFilters = isProfessional
    ? { professionalUserId: userId }
    : professionalId
      ? { professionalId }
      : {};

  // 4. Fetch from the data layer. The data provider takes the
  //    `dateRange` as `{ start: Date, end: Date }`.
  const result = await getBookings(organizationId, {
    ...scopedFilters,
    dateRange: {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end),
    },
  });

  // 5. Serialize the dates to ISO strings on the way out. The rest
  //    of the payload is already JSON-safe.
  return result.bookings.map((booking) => ({
    ...booking,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
  }));
}
