"use server";

/**
 * updateService Server Action.
 *
 * Updates an existing service. Validates input with the Zod 4 schema,
 * enforces RBAC, scopes by org via getServiceById, then delegates the
 * partial Money→Float write to the data layer.
 *
 * RBAC (AD3):
 * - ADMIN / SECRETARY can update services.
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
 *   5. Delegate to data layer's `updateService(orgId, id, data)`
 *      (data layer uses $transaction for atomic ownership + update)
 *   6. Catch P2025 → "Servicio no encontrado" (record vanished
 *      between getServiceById and the data-layer write)
 *   7. revalidatePath("/dashboard/services")
 *   8. Return { success: true }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PROFESSIONAL / PATIENT role → "No autorizado"
 * - getServiceById returns null (missing OR wrong org) → "Servicio no encontrado"
 * - Prisma P2025 (record vanished) → "Servicio no encontrado"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { Prisma } from "@/generated/prisma/client";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import {
  getServiceById,
  updateService as updateServiceData,
} from "@/modules/services/data/service-data";

import { updateServiceSchema } from "./service-actions.schema";
import type {
  ServiceResult,
  UpdateServiceInput,
} from "./service-actions.types";

export async function updateService(
  input: UpdateServiceInput,
): Promise<ServiceResult> {
  // 1. Zod 4 validation
  const parsed = updateServiceSchema.safeParse(input);
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

  // 4. Verify the service exists in the org (and is the right org).
  const existing = await getServiceById(organizationId, id);
  if (!existing) {
    return { success: false, error: "Servicio no encontrado" };
  }

  // 5. Delegate to the data layer for the actual partial update.
  try {
    await updateServiceData(organizationId, id, data);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "Servicio no encontrado" };
    }
    throw error;
  }

  // 6. Revalidate the services list page
  revalidatePath("/dashboard/services");

  return { success: true };
}
