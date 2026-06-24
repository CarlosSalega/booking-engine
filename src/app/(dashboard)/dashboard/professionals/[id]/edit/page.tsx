/**
 * `/dashboard/professionals/[id]/edit` — operator-facing edit form
 * for one professional.
 *
 * Server Component wrapper. The page:
 * 1. Reads `params.id` from the dynamic route.
 * 2. Resolves `organizationId` from the active org cookie.
 * 3. Fetches the professional with `getProfessionalById(orgId, id)`
 *    — `null` → `notFound()` (404). Wrong org → also 404 (silent
 *    block).
 * 4. Renders the page header.
 * 5. Renders the `<ProfessionalForm>` Client Component in edit mode
 *    with the professional as a prop. The Client Component owns form
 *    state, Zod validation, the `updateProfessional` Server Action
 *    call, and the post-submit redirect.
 *
 * The Server / Client split is intentional: the page is purely data
 * fetching + 404 handling, the Client Component is the interactive
 * form. RBAC: the dashboard layout already redirects PATIENT users;
 * the `updateProfessional` Server Action re-checks the role as
 * defense-in-depth.
 */

import { notFound } from "next/navigation";

import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getProfessionalById } from "@/modules/professionals/data/professional-data";

import { ProfessionalForm } from "@/components/professionals/professional-form";

interface ProfessionalEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfessionalEditPage({
  params,
}: ProfessionalEditPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const professional = await getProfessionalById(organizationId, id);

  if (!professional) {
    notFound();
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar profesional
        </h1>
        <p className="text-sm text-muted-foreground">
          Modificá los datos del profesional. Los cambios se guardan al
          confirmar.
        </p>
      </div>
      <ProfessionalForm mode="edit" professional={professional} />
    </div>
  );
}
