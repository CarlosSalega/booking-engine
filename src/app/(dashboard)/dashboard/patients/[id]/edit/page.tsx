/**
 * `/dashboard/patients/[id]/edit` — operator-facing edit form for one patient.
 *
 * Server Component wrapper. The page:
 * 1. Reads `params.id` from the dynamic route.
 * 2. Resolves `organizationId` from the active org cookie.
 * 3. Fetches the patient with `getPatientById(orgId, id)` — `null` →
 *    `notFound()` (404). Wrong org → also 404 (silent block).
 * 4. Renders the `<PatientForm>` Client Component with the patient as
 *    a prop. The Client Component owns form state, Zod validation,
 *    the Server Action call, and the post-submit redirect.
 *
 * The Server / Client split is intentional: the page is purely data
 * fetching + 404 handling, the Client Component is the interactive
 * form. RBAC: the dashboard layout already redirects PATIENT users;
 * the `updatePatient` Server Action re-checks the role as
 * defense-in-depth.
 */

import { notFound } from "next/navigation";

import { getOrganizationId } from "@/modules/dashboard";
import {
  getPatientById,
  type EnrichedPatient,
} from "@/modules/patients";

import { PatientForm } from "@/components/patients/patient-form";

interface PatientEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientEditPage({
  params,
}: PatientEditPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const patient = await getPatientById(organizationId, id);

  if (!patient) {
    notFound();
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar paciente</h1>
        <p className="text-sm text-muted-foreground">
          Modificá los datos del paciente. Los cambios se guardan al confirmar.
        </p>
      </div>
      <PatientForm patient={patient as EnrichedPatient} />
    </div>
  );
}
