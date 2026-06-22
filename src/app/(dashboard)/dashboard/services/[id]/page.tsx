/**
 * `/dashboard/services/[id]` — operator-facing detail view for one service.
 *
 * Server Component. Responsibilities (enforced server-side, never trust
 * the client):
 * 1. Read `params.id` from the dynamic route.
 * 2. Resolve `organizationId` from the active org cookie.
 * 3. Fetch the service with `getServiceById(orgId, id)` — this returns
 *    `null` when the service is in a different org, so cross-tenant
 *    access is silently blocked.
 * 4. Resolve the session role so the Edit button can be hidden for
 *    PROFESSIONAL (read-only).
 * 5. `null` from `getServiceById` → `notFound()` (404).
 * 6. Hand the enriched service to the `<ServiceDetailCard>` Client
 *    Component, which owns the visual presentation + the status
 *    change dropdown.
 *
 * The page itself is intentionally thin: the data layer owns scoping
 * and 404 semantics; the Client Component owns rendering.
 */

import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/core/auth";
import { getOrganizationId } from "@/modules/dashboard";
import { USER_ROLE } from "@/modules/auth/domain";
import { getServiceById } from "@/modules/services";

import { ServiceDetailCard } from "@/components/services/service-detail-card";

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const service = await getServiceById(organizationId, id);

  if (!service) {
    // Service doesn't exist or belongs to a different org → 404.
    notFound();
  }

  // RBAC: hide the Edit button for PROFESSIONAL (read-only per AD3).
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role;
  const canEdit = role === USER_ROLE.ADMIN || role === USER_ROLE.SECRETARY;

  return <ServiceDetailCard service={service} canEdit={canEdit} />;
}
