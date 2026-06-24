/**
 * `/dashboard/professionals/new` — operator-facing create page for a
 * professional.
 *
 * Server Component. Responsibilities:
 * 1. Resolve `organizationId` from the active org cookie.
 * 2. Render the page header.
 * 3. Render the `<ProfessionalForm>` Client Component in create mode.
 *
 * The page itself is intentionally thin: the Client Component owns
 * the form state, Zod validation, the `createProfessional` Server
 * Action call, and the post-submit redirect.
 *
 * RBAC: the dashboard layout already redirects PATIENT users. The
 * `createProfessional` Server Action re-checks the role as defense
 * in depth. PROFESSIONAL users can view the page but the Server
 * Action will reject the submission; we still render the form to
 * keep the URL/page consistent.
 */

import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";

import { ProfessionalForm } from "@/components/professionals/professional-form";

export default async function NewProfessionalPage() {
  await getOrganizationId();

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nuevo Profesional
        </h1>
        <p className="text-sm text-muted-foreground">
          Creá un nuevo profesional. Los cambios se guardan al confirmar.
        </p>
      </div>
      <ProfessionalForm mode="create" />
    </div>
  );
}
