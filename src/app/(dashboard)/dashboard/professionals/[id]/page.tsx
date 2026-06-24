/**
 * `/dashboard/professionals/[id]` — operator-facing detail view for
 * one professional.
 *
 * Server Component. Responsibilities (enforced server-side, never
 * trust the client):
 * 1. Read `params.id` from the dynamic route.
 * 2. Resolve `organizationId` from the active org cookie.
 * 3. Fetch the professional with `getProfessionalById(orgId, id)` —
 *    this returns `null` when the professional is in a different
 *    org, so cross-tenant access is silently blocked.
 * 4. Resolve the session role so the Edit button and status change
 *    dropdown can be hidden for PROFESSIONAL (read-only per AD3).
 * 5. `null` from `getProfessionalById` → `notFound()` (404).
 * 6. Hand the enriched professional to the
 *    `<ProfessionalDetailCard>` Client Component, which owns the
 *    visual presentation + the status change dropdown.
 *
 * The page itself is intentionally thin: the data layer owns
 * scoping and 404 semantics; the Client Component owns rendering.
 */

import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getProfessionalById } from "@/modules/professionals/data/professional-data";

import { ProfessionalDetailCard } from "@/components/professionals/professional-detail-card";

interface ProfessionalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfessionalDetailPage({
  params,
}: ProfessionalDetailPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const professional = await getProfessionalById(organizationId, id);

  if (!professional) {
    // Professional doesn't exist or belongs to a different org → 404.
    notFound();
  }

  // RBAC: hide the Edit button and status change dropdown for
  // PROFESSIONAL (read-only per AD3).
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role;
  const canEdit = role === USER_ROLE.ADMIN || role === USER_ROLE.SECRETARY;

  return (
    <ProfessionalDetailCard professional={professional} canEdit={canEdit} />
  );
}
