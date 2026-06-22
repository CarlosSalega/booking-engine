"use server";

/**
 * changeServiceStatus Server Action.
 *
 * Toggles a service's status (ACTIVE ↔ INACTIVE). No state machine — any
 * transition is valid (see design.md AD4). The status update is a simple
 * field update via `prisma.service.update`; no overlap/availability
 * checks (services have no schedule by themselves — bookings carry
 * their own status independently).
 *
 * RBAC (AD3):
 * - ADMIN / SECRETARY can change status.
 * - PROFESSIONAL is rejected with "No autorizado" (read-only).
 * - PATIENT cannot reach this action (gated by the dashboard layout AND
 *   the per-action role check below as defense-in-depth).
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PROFESSIONAL or role === PATIENT
 *   4. getServiceById(orgId, id) → null → "Servicio no encontrado"
 *      (covers both missing records and wrong-org access)
 *   5. prisma.service.update({ where: { id }, data: { status } })
 *   6. revalidatePath("/dashboard/services")
 *   7. Return { success: true }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PROFESSIONAL / PATIENT role → "No autorizado"
 * - getServiceById returns null (missing OR wrong org) → "Servicio no encontrado"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getServiceById } from "@/modules/services/data/service-data";

import { changeServiceStatusSchema } from "./service-actions.schema";
import type {
  ChangeServiceStatusInput,
  ServiceResult,
} from "./service-actions.types";

export async function changeServiceStatus(
  input: ChangeServiceStatusInput,
): Promise<ServiceResult> {
  // 1. Zod 4 validation
  const parsed = changeServiceStatusSchema.safeParse(input);
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

  // 4. Verify the service exists in the org (and is the right org).
  const existing = await getServiceById(organizationId, parsed.data.id);
  if (!existing) {
    return { success: false, error: "Servicio no encontrado" };
  }

  // 5. Update the status. No state machine — any transition is valid.
  await prisma.service.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  // 6. Revalidate the services list page
  revalidatePath("/dashboard/services");

  return { success: true };
}
