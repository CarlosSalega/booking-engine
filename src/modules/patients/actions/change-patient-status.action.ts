"use server";

/**
 * changePatientStatus Server Action.
 *
 * Updates a patient's status (ACTIVE / INACTIVE / BLOCKED). No state
 * machine — any transition is valid (see design.md AD8).
 *
 * RBAC:
 * - ADMIN / SECRETARY / PROFESSIONAL can change status.
 * - PATIENT cannot reach this action.
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PATIENT
 *   4. getPatientById(orgId, id) → null → "Paciente no encontrado"
 *   5. prisma.patient.update({ where: { id }, data: { status } })
 *   6. revalidatePath("/dashboard/patients")
 *   7. Return { success: true }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PATIENT role → "No autorizado"
 * - getPatientById returns null (missing OR wrong org) → "Paciente no encontrado"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getPatientById } from "@/modules/patients/data/patient-data";

import { changePatientStatusSchema } from "./patient-actions.schema";
import type {
  ChangeStatusInput,
  PatientResult,
} from "./patient-actions.types";

export async function changePatientStatus(
  input: ChangeStatusInput,
): Promise<PatientResult> {
  // 1. Zod 4 validation
  const parsed = changePatientStatusSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session + organization
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: PATIENT cannot change status.
  if (session.user.role === USER_ROLE.PATIENT) {
    return { success: false, error: "No autorizado" };
  }

  const organizationId = await getOrganizationId();

  // 4. Verify the patient exists in the org (and is the right org).
  const existing = await getPatientById(organizationId, parsed.data.id);
  if (!existing) {
    return { success: false, error: "Paciente no encontrado" };
  }

  // 5. Update the status. No state machine — any transition is valid.
  await prisma.patient.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  // 6. Revalidate the patients list page
  revalidatePath("/dashboard/patients");

  return { success: true };
}
