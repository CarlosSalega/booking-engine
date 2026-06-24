"use server";

/**
 * changeProfessionalStatus Server Action.
 *
 * Toggles a professional's status (ACTIVE ↔ INACTIVE). No state machine —
 * any transition is valid (see design.md AD4). The status update is a
 * simple field update via `prisma.professional.update`; no
 * overlap/availability checks (professionals have no schedule by
 * themselves — bookings carry their own status independently).
 *
 * RBAC (design AD3):
 * - ADMIN / SECRETARY can change status.
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
 *   5. prisma.professional.update({ where: { id }, data: { status } })
 *   6. revalidatePath("/dashboard/professionals")
 *   7. Return { success: true }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PROFESSIONAL / PATIENT role → "No autorizado"
 * - getProfessionalById returns null (missing OR wrong org) → "Profesional no encontrado"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getProfessionalById } from "@/modules/professionals/data/professional-data";

import { changeProfessionalStatusSchema } from "./professional-actions.schema";
import type {
  ChangeProfessionalStatusInput,
  ProfessionalResult,
} from "./professional-actions.types";

export async function changeProfessionalStatus(
  input: ChangeProfessionalStatusInput,
): Promise<ProfessionalResult> {
  // 1. Zod 4 validation
  const parsed = changeProfessionalStatusSchema.safeParse(input);
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

  const organizationId = await getOrganizationId();

  // 4. Verify the professional exists in the org (and is the right org).
  const existing = await getProfessionalById(organizationId, parsed.data.id);
  if (!existing) {
    return { success: false, error: "Profesional no encontrado" };
  }

  // 5. Update the status. No state machine — any transition is valid.
  await prisma.professional.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  // 6. Revalidate the professionals list page
  revalidatePath("/dashboard/professionals");

  return { success: true };
}
