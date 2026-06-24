"use server";

/**
 * updateProfessional Server Action.
 *
 * Updates an existing professional. Validates input with the Zod 4
 * schema, enforces RBAC, scopes by org via `getProfessionalById`, then
 * delegates the partial split-write (User + Professional) to the data
 * layer.
 *
 * RBAC (design AD3):
 * - ADMIN / SECRETARY can update professionals.
 * - PROFESSIONAL is rejected with "No autorizado" (read-only).
 * - PATIENT cannot reach this action (gated by the dashboard layout AND
 *   the per-action role check below as defense-in-depth).
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PROFESSIONAL or role === PATIENT
 *   4. getProfessionalById(orgId, id) → null → "Profesional no encontrado"
 *      (covers both missing records and wrong-org access)
 *   5. Delegate to data layer's `updateProfessional(orgId, id, data)`
 *      (data layer runs split-write $transaction with P2025 → NotFound)
 *   6. Catch P2025 → "Profesional no encontrado" (record vanished
 *      between getProfessionalById and the data-layer write)
 *   7. Catch P2002 → "Ya existe un profesional con ese email"
 *   8. revalidatePath("/dashboard/professionals")
 *   9. Return { success: true }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PROFESSIONAL / PATIENT role → "No autorizado"
 * - getProfessionalById returns null (missing OR wrong org) → "Profesional no encontrado"
 * - Prisma P2025 (record vanished) → "Profesional no encontrado"
 * - Prisma P2002 (duplicate email) → "Ya existe un profesional con ese email"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { Prisma } from "@/generated/prisma/client";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import {
  getProfessionalById,
  updateProfessional as updateProfessionalData,
} from "@/modules/professionals/data/professional-data";

import { updateProfessionalSchema } from "./professional-actions.schema";
import type {
  ProfessionalResult,
  UpdateProfessionalInput,
} from "./professional-actions.types";

export async function updateProfessional(
  input: UpdateProfessionalInput,
): Promise<ProfessionalResult> {
  // 1. Zod 4 validation
  const parsed = updateProfessionalSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth: get session + organization
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: PROFESSIONAL is read-only (AD3); PATIENT is defense-in-depth.
  const role = session.user.role;
  if (
    role === USER_ROLE.PROFESSIONAL ||
    role === USER_ROLE.PATIENT
  ) {
    return { success: false, error: "No autorizado" };
  }

  const { id, ...data } = parsed.data;
  const organizationId = await getOrganizationId();

  // 4. Verify the professional exists in the org (and is the right org).
  const existing = await getProfessionalById(organizationId, id);
  if (!existing) {
    return { success: false, error: "Profesional no encontrado" };
  }

  // 5. Delegate to the data layer for the actual partial update. The
  //    data layer splits the write across User + Professional in
  //    $transaction and translates P2025 into ProfessionalNotFoundError.
  try {
    await updateProfessionalData(organizationId, id, data);
  } catch (error) {
    // 6. Data layer throws ProfessionalNotFoundError when the record
    //    vanished between the by-id guard and the update.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Profesional no encontrado" };
      }
      // 7. P2002 — duplicate email from a User.email update.
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Ya existe un profesional con ese email",
        };
      }
    }
    throw error;
  }

  // 8. Revalidate the professionals list page
  revalidatePath("/dashboard/professionals");

  return { success: true };
}
