"use server";

/**
 * Settings Server Actions — `updateBusiness` / `updateBookings` /
 * `updateCancellations`.
 *
 * Three thin orchestrators that update one section of the org's
 * `OrganizationSettings` row each. All three follow the same
 * flow (mirrors the services actions):
 *
 *   1. Zod 4 validation against the section schema → safeParse
 *   2. Auth: getSession via Better Auth
 *   3. RBAC: only ADMIN may update settings (defense-in-depth; the
 *      form layer + SettingsGuard in PR #3 will additionally
 *      redirect SECRETARY/PROFESSIONAL, but here we hard-reject
 *      non-ADMIN)
 *   4. Org resolution: `getOrganizationId()` (single-org fixture today)
 *   5. Data write: `upsertSettings(orgId, parsed.data)` (create on
 *      first call, partial update on subsequent calls)
 *   6. Cache invalidation: `updateTag("settings")` for SWR background
 *      revalidation of the `getSettings` read path
 *   7. Return: `SettingsResult<void>` (the data row is NOT returned
 *      to the UI; the form layer re-reads via `getSettings` on
 *      `router.refresh()`)
 *
 * Failure modes (all return `{ success: false, error }`):
 * - Zod parse error → first issue message (Spanish)
 * - No session       → "No autorizado"
 * - Non-ADMIN role   → "No autorizado"
 *
 * Spec source: `openspec/changes/settings/specs/settings-domain/spec.md`
 *   — Requirement: Cache Layer
 *     Scenario: Cache invalidation on write
 */

import { headers } from "next/headers";
import { updateTag } from "next/cache";

import { auth } from "@/core/auth";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { upsertSettings } from "@/modules/settings/data/settings-data";

import {
  updateBookingsSchema,
  updateBusinessSchema,
  updateCancellationsSchema,
} from "./settings-actions.schema";
import type {
  SettingsResult,
  UpdateBookingsInput,
  UpdateBusinessInput,
  UpdateCancellationsInput,
} from "./settings-actions.types";

// ---------------------------------------------------------------------------
// updateBusiness — name, description, address, timezone, phone, email
// ---------------------------------------------------------------------------

/**
 * Update the business-identity section of the organization's settings.
 * ADMIN-only. Partial updates are valid (only the provided fields
 * are written, the rest of the row is preserved by `upsertSettings`).
 */
export async function updateBusiness(
  input: UpdateBusinessInput,
): Promise<SettingsResult> {
  // 1. Zod 4 validation
  const parsed = updateBusinessSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: only ADMIN may update settings. SECRETARY is read-only
  //    (the form layer in PR #3 disables all fields for SECRETARY;
  //    we hard-reject here as defense-in-depth). PROFESSIONAL and
  //    PATIENT are rejected at the dashboard layout AND here.
  if (session.user.role !== USER_ROLE.ADMIN) {
    return { success: false, error: "No autorizado" };
  }

  // 4. Org resolution
  const organizationId = await getOrganizationId();

  // 5. Data write
  await upsertSettings(organizationId, parsed.data);

  // 6. Cache invalidation (SWR background revalidation)
  updateTag("settings");

  return { success: true };
}

// ---------------------------------------------------------------------------
// updateBookings — defaultDurationMinutes, minAdvanceBookingHours,
//                  maxBookingsPerDay, bufferMinutes
// ---------------------------------------------------------------------------

/**
 * Update the booking-rules section of the organization's settings.
 * ADMIN-only. All four fields are independently optional — partial
 * updates are valid.
 */
export async function updateBookings(
  input: UpdateBookingsInput,
): Promise<SettingsResult> {
  // 1. Zod 4 validation
  const parsed = updateBookingsSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: ADMIN-only
  if (session.user.role !== USER_ROLE.ADMIN) {
    return { success: false, error: "No autorizado" };
  }

  // 4. Org resolution
  const organizationId = await getOrganizationId();

  // 5. Data write
  await upsertSettings(organizationId, parsed.data);

  // 6. Cache invalidation
  updateTag("settings");

  return { success: true };
}

// ---------------------------------------------------------------------------
// updateCancellations — cancellationEnabled, cancellationLimitHours
// ---------------------------------------------------------------------------

/**
 * Update the cancellation-rules section of the organization's
 * settings. ADMIN-only. Both fields are independently optional.
 */
export async function updateCancellations(
  input: UpdateCancellationsInput,
): Promise<SettingsResult> {
  // 1. Zod 4 validation
  const parsed = updateCancellationsSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  // 2. Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC: ADMIN-only
  if (session.user.role !== USER_ROLE.ADMIN) {
    return { success: false, error: "No autorizado" };
  }

  // 4. Org resolution
  const organizationId = await getOrganizationId();

  // 5. Data write
  await upsertSettings(organizationId, parsed.data);

  // 6. Cache invalidation
  updateTag("settings");

  return { success: true };
}
