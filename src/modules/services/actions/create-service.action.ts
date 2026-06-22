"use server";

/**
 * createService Server Action.
 *
 * Creates a new service. Validates input with the Zod 4 schema,
 * enforces RBAC (ADMIN / SECRETARY; PROFESSIONAL read-only, rejected;
 * PATIENT blocked at layout + defense-in-depth in this action), then
 * delegates to the data layer's `createService(orgId, data)`.
 *
 * RBAC (AD3):
 * - ADMIN / SECRETARY can create services.
 * - PROFESSIONAL is rejected with "No autorizado" (read-only).
 * - PATIENT cannot reach this action (gated by the dashboard layout AND
 *   the per-action role check below as defense-in-depth).
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PROFESSIONAL or role === PATIENT
 *   4. Delegate to data layer's `createService(orgId, data)` (single-table
 *      insert — no $transaction needed; the User/Patient split from the
 *      patients module does not apply here, services are org-level
 *      catalog items with no separate User row).
 *   5. revalidatePath("/dashboard/services")
 *   6. Return { success: true, data: { id } }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PROFESSIONAL / PATIENT role → "No autorizado"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { createService as createServiceData } from "@/modules/services/data/service-data";

import { createServiceSchema } from "./service-actions.schema";
import type {
  CreateServiceInput,
  ServiceResult,
} from "./service-actions.types";

export async function createService(
  input: CreateServiceInput,
): Promise<ServiceResult<{ id: string }>> {
  // 1. Zod 4 validation
  const parsed = createServiceSchema.safeParse(input);
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

  // 4. Delegate to the data layer for the actual create. The data layer
  //    handles Money→Float flattening and ARS currency hardcoding.
  const created = await createServiceData(organizationId, parsed.data);

  // 5. Revalidate the services list page
  revalidatePath("/dashboard/services");

  return { success: true, data: { id: created.id } };
}
