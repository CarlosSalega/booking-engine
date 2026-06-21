/**
 * `/dashboard/bookings/[id]` — operator-facing detail view for one booking.
 *
 * Server Component. The URL `/dashboard/bookings/[id]` requires the
 * file to live under `app/(dashboard)/dashboard/bookings/[id]/page.tsx`
 * (the route group `(dashboard)` is transparent — it only applies the
 * dashboard layout; the actual path segment comes from `dashboard/`).
 *
 * Responsibilities (enforced server-side, never trust the client):
 * 1. Read `params.id` from the dynamic route.
 * 2. Resolve the session — redirect to login if absent.
 * 3. Resolve `organizationId` from the active org cookie.
 * 4. Fetch the booking with `getBookingById(orgId, id)` — this returns
 *    `null` when the booking is in a different org, so cross-tenant
 *    access is silently blocked.
 * 5. PROFESSIONAL scoping: a professional can only see their own
 *    bookings. If the booking's professional doesn't match the
 *    session user, we treat it as not-found (per the spec: "404 for
 *    not-found/unauthorized"). This is intentional — using `notFound`
 *    instead of `redirect` prevents leaking the existence of the
 *    booking to a curious professional.
 * 6. Hand the enriched booking + role to the `<BookingDetail>` Client
 *    Component, which owns the visual presentation + the action bar.
 *
 * The page itself is intentionally thin: the data layer owns scoping
 * and 404 semantics; the Client Component owns rendering. A future
 * PR can add `generateMetadata` for OG titles without touching the
 * component.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain/roles";
import { getOrganizationId } from "@/modules/dashboard";
import { getBookingById } from "@/modules/bookings";
import type { UserRoleType } from "@/modules/auth/domain/roles";

import { BookingDetail } from "@/components/bookings/booking-detail";

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    // Layout already redirects PATIENTs, and `proxy.ts` should block
    // unauthenticated requests — but this is a defensive check in
    // case the layout is bypassed.
    notFound();
  }

  const role = (session.user.role as UserRoleType | undefined) ?? USER_ROLE.PATIENT;
  const userId = session.user.id;
  const organizationId = await getOrganizationId();

  const booking = await getBookingById(organizationId, id);

  if (!booking) {
    // Booking doesn't exist or belongs to a different org → 404.
    notFound();
  }

  // PROFESSIONAL ownership check. A professional can only see their own
  // bookings. We use `notFound` (not `redirect`) to avoid leaking the
  // existence of someone else's booking.
  if (role === USER_ROLE.PROFESSIONAL && booking.professional.userId !== userId) {
    notFound();
  }

  return <BookingDetail booking={booking} role={role} />;
}
