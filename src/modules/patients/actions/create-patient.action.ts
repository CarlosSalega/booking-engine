"use server";

/**
 * createPatient Server Action.
 *
 * Creates a new patient with a linked Better Auth User. Validates input
 * with the Zod 4 schema, enforces RBAC, then runs an atomic dedup check
 * followed by the data layer's createPatient call.
 *
 * RBAC:
 * - ADMIN / SECRETARY / PROFESSIONAL can create patients.
 * - PATIENT cannot reach this action (gated by the dashboard layout AND
 *   the per-action role check below as defense-in-depth).
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PATIENT
 *   4. $transaction:
 *      a. Fetch all org patients (with User data) for dedup
 *      b. Run `patientMatches` against the input — abort with DedupError
 *         if any match
 *   5. Call data layer's `createPatient(orgId, data, createdByUserId)`
 *      outside the dedup transaction (it has its own $transaction
 *      for the User+Patient split write).
 *   6. Catch P2002 → "Ya existe un paciente con ese email"
 *   7. Catch DedupError → "Ya existe un paciente con los mismos datos"
 *   8. revalidatePath("/dashboard/patients")
 *   9. Return { success: true, data: { id } }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PATIENT role → "No autorizado"
 * - Dedup match inside transaction → "Ya existe un paciente con los mismos datos"
 * - Prisma P2002 (unique email) → "Ya existe un paciente con ese email"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { createPatient as createPatientData } from "@/modules/patients/data/patient-data";
import { patientMatches, type PatientStatusType } from "@/modules/patients/domain/patient";
import type { PatientData } from "@/modules/patients/domain/patient.schema";

import { createPatientSchema } from "./patient-actions.schema";
import type {
  CreatePatientInput,
  PatientResult,
} from "./patient-actions.types";

/** Sentinel error used to abort the dedup check. */
class DedupError extends Error {
  constructor() {
    super("Patient dedup match");
    this.name = "DedupError";
  }
}

export async function createPatient(
  input: CreatePatientInput,
): Promise<PatientResult<{ id: string }>> {
  // 1. Zod 4 validation
  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session + organization
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  const role = session.user.role;
  const userId = session.user.id;
  const organizationId = await getOrganizationId();

  // 3. RBAC: PATIENT cannot create patients (defense-in-depth; layout
  //    already blocks the dashboard).
  if (role === USER_ROLE.PATIENT) {
    return { success: false, error: "No autorizado" };
  }

  // 4. Atomic dedup check inside a Prisma transaction
  try {
    await prisma.$transaction(async (tx) => {
      // Fetch all org patients (with User data) for dedup
      const existingPatients = await tx.patient.findMany({
        where: { organizationId },
        include: { user: { select: { name: true, email: true } } },
      });

      // The dedup function only uses 4 fields (fullName, email, phone,
      // documentId) but its signature requires `Patient | PatientData`.
      // We build a minimal valid DTO using the validated input + a
      // synthetic organizationId (not used by the dedup logic) and a
      // status (dedup ignores it).
      const organizationIdForDedup = organizationId;
      const statusForDedup: PatientStatusType = parsed.data.status;
      const inputDTO: PatientData = {
        organizationId: organizationIdForDedup,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        documentId: parsed.data.documentId,
        status: statusForDedup,
      };

      // Domain dedup check
      for (const existing of existingPatients) {
        if (
          patientMatches(
            {
              organizationId: existing.organizationId,
              fullName: existing.user.name,
              email: existing.user.email,
              phone: existing.phone ?? undefined,
              documentId: existing.documentId ?? undefined,
              status: existing.status as PatientStatusType,
            },
            inputDTO,
          )
        ) {
          throw new DedupError();
        }
      }
    });
  } catch (error) {
    if (error instanceof DedupError) {
      return {
        success: false,
        error: "Ya existe un paciente con los mismos datos",
      };
    }
    throw error;
  }

  // 5. Delegate to the data layer for the actual create
  let created;
  try {
    created = await createPatientData(
      organizationId,
      {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        documentId: parsed.data.documentId,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
      userId,
    );
  } catch (error) {
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

  return { success: true, data: { id: created.id } };
}
