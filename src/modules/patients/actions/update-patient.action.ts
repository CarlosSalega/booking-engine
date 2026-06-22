"use server";

/**
 * updatePatient Server Action.
 *
 * Updates an existing patient. Validates input with the Zod 4 schema,
 * enforces RBAC, scopes by org via getPatientById, then delegates the
 * split User+Patient write to the data layer.
 *
 * RBAC:
 * - ADMIN / SECRETARY / PROFESSIONAL can update patients.
 * - PATIENT cannot reach this action.
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PATIENT
 *   4. getPatientById(orgId, id) → null → "Paciente no encontrado"
 *   5. Delegate to data layer's updatePatient(orgId, id, data)
 *   6. Catch P2025 → "Paciente no encontrado"
 *   7. Catch P2002 → "Ya existe un paciente con ese email"
 *   8. revalidatePath("/dashboard/patients")
 *   9. Return { success: true }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PATIENT role → "No autorizado"
 * - getPatientById returns null (missing OR wrong org) → "Paciente no encontrado"
 * - Prisma P2025 (record vanished between checks) → "Paciente no encontrado"
 * - Prisma P2002 (unique email conflict) → "Ya existe un paciente con ese email"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { Prisma } from "@/generated/prisma/client";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import {
  getPatientById,
  updatePatient as updatePatientData,
} from "@/modules/patients/data/patient-data";

import { updatePatientSchema } from "./patient-actions.schema";
import type {
  PatientResult,
  UpdatePatientInput,
} from "./patient-actions.types";

export async function updatePatient(
  input: UpdatePatientInput,
): Promise<PatientResult> {
  // 1. Zod 4 validation
  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session + organization
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: PATIENT cannot update patients.
  if (session.user.role === USER_ROLE.PATIENT) {
    return { success: false, error: "No autorizado" };
  }

  const { id, ...data } = parsed.data;
  const organizationId = await getOrganizationId();

  // 4. Verify the patient exists in the org (and is the right org).
  const existing = await getPatientById(organizationId, id);
  if (!existing) {
    return { success: false, error: "Paciente no encontrado" };
  }

  // 5. Delegate to the data layer for the actual update.
  try {
    await updatePatientData(organizationId, id, {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      documentId: data.documentId,
      status: data.status,
      notes: data.notes,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "Paciente no encontrado" };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Ya existe un paciente con ese email",
      };
    }
    throw error;
  }

  // 6. Revalidate the patients list page
  revalidatePath("/dashboard/patients");

  return { success: true };
}
