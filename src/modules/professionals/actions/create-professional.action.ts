"use server";

/**
 * createProfessional Server Action.
 *
 * Creates a new professional. Validates input with the Zod 4 schema,
 * enforces RBAC (ADMIN / SECRETARY; PROFESSIONAL read-only, rejected;
 * PATIENT blocked at layout + defense-in-depth in this action), then
 * delegates to the data layer's `createProfessional(orgId, data)` which
 * runs the split-write inside `$transaction` (User + Professional).
 *
 * RBAC (design AD3):
 * - ADMIN / SECRETARY can create professionals.
 * - PROFESSIONAL is rejected with "No autorizado" (read-only).
 * - PATIENT cannot reach this action (gated by the dashboard layout AND
 *   the per-action role check below as defense-in-depth).
 *
 * Flow:
 *   1. Zod 4 validation → safeParse
 *   2. Auth: getSession + getOrganizationId
 *   3. RBAC: reject if role === PROFESSIONAL or role === PATIENT
 *   4. Delegate to data layer's `createProfessional(orgId, data)`
 *      (split-write: User(role=PROFESSIONAL) + Professional in $transaction)
 *   5. Catch Prisma P2002 (email uniqueness on User) → "Ya existe un profesional con ese email"
 *   6. revalidatePath("/dashboard/professionals")
 *   7. Return { success: true, data: { id } }
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session → "No autorizado"
 * - PROFESSIONAL / PATIENT role → "No autorizado"
 * - P2002 (duplicate email on User) → "Ya existe un profesional con ese email"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/core/auth";
import { Prisma } from "@/generated/prisma/client";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { createProfessional as createProfessionalData } from "@/modules/professionals/data/professional-data";

import { createProfessionalSchema } from "./professional-actions.schema";
import type {
  CreateProfessionalInput,
  ProfessionalResult,
} from "./professional-actions.types";

export async function createProfessional(
  input: CreateProfessionalInput,
): Promise<ProfessionalResult<{ id: string }>> {
  // 1. Zod 4 validation
  const parsed = createProfessionalSchema.safeParse(input);
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
  //    runs the split-write $transaction (User + Professional).
  let created;
  try {
    created = await createProfessionalData(organizationId, parsed.data);
  } catch (error) {
    // 5. Map Prisma P2002 (email uniqueness on User) to a user-facing
    //    Spanish message. Other errors propagate.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Ya existe un profesional con ese email",
      };
    }
    throw error;
  }

  // 6. Revalidate the professionals list page
  revalidatePath("/dashboard/professionals");

  return { success: true, data: { id: created.id } };
}
