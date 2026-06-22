/**
 * `/dashboard/services/[id]/edit` — operator-facing edit form for one
 * service.
 *
 * Server Component wrapper. The page:
 * 1. Reads `params.id` from the dynamic route.
 * 2. Resolves `organizationId` from the active org cookie.
 * 3. Fetches the service with `getServiceById(orgId, id)` — `null` →
 *    `notFound()` (404). Wrong org → also 404 (silent block).
 * 4. Fetches the org's ACTIVE professionals so the form's
 *    `Profesional` select has a populated list.
 * 5. Renders the `<ServiceForm>` Client Component in edit mode with
 *    the service as a prop. The Client Component owns form state,
 *    Zod validation, the Server Action call, and the post-submit
 *    redirect.
 *
 * The Server / Client split is intentional: the page is purely data
 * fetching + 404 handling, the Client Component is the interactive
 * form. RBAC: the dashboard layout already redirects PATIENT users;
 * the `updateService` Server Action re-checks the role as
 * defense-in-depth.
 */

import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/modules/dashboard";
import { getServiceById } from "@/modules/services";

import { ServiceForm } from "@/components/services/service-form";

interface ServiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceEditPage({
  params,
}: ServiceEditPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const service = await getServiceById(organizationId, id);

  if (!service) {
    notFound();
  }

  const professionals = await prisma.professional.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: {
      id: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const professionalOptions = professionals.map((p) => ({
    id: p.id,
    name: p.user.name,
  }));

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar servicio</h1>
        <p className="text-sm text-muted-foreground">
          Modificá los datos del servicio. Los cambios se guardan al
          confirmar.
        </p>
      </div>
      <ServiceForm
        mode="edit"
        service={service}
        professionals={professionalOptions}
      />
    </div>
  );
}
