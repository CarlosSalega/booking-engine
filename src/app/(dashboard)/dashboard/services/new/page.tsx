/**
 * `/dashboard/services/new` — operator-facing create page for a service.
 *
 * Server Component. Responsibilities:
 * 1. Resolve `organizationId` from the active org cookie.
 * 2. Fetch the org's ACTIVE professionals so the form's
 *    `Profesional` select has a populated list.
 * 3. Render the `<ServiceForm>` Client Component in create mode.
 *
 * The page itself is intentionally thin: the data layer owns the
 * org-scoped professionals query; the Client Component owns the
 * form state, Zod validation, the Server Action call, and the
 * post-submit redirect.
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * `createService` Server Action re-checks the role as defense in
 * depth. PROFESSIONAL users can view this page but the Server
 * Action will reject their submission; we still render the form
 * to keep the URL/page consistent.
 */

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/modules/dashboard";

import { ServiceForm } from "@/components/services/service-form";

export default async function NewServicePage() {
  const organizationId = await getOrganizationId();

  // List ACTIVE professionals in the org. The form needs a small,
  // ordered list of {id, name} pairs. We could lift this to a data
  // helper later, but inlining keeps the PR scope tight.
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
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo Servicio</h1>
        <p className="text-sm text-muted-foreground">
          Creá un nuevo servicio del catálogo. Los cambios se guardan al
          confirmar.
        </p>
      </div>
      <ServiceForm
        mode="create"
        professionals={professionalOptions}
      />
    </div>
  );
}
