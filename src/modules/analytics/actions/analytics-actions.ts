"use server";

/**
 * Analytics Server Actions — `getAnalyticsAction`.
 *
 * Single orchestrator that returns all analytics metrics in one call.
 * Follows the same flow as the settings actions:
 *
 *   1. Zod 4 validation (analyticsQuerySchema)
 *   2. Auth: getSession via Better Auth
 *   3. RBAC: PATIENT → block, PROFESSIONAL → inject userId,
 *      ADMIN/SECRETARY → org-wide (optional filter)
 *   4. Org resolution: getOrganizationId()
 *   5. Settings resolution: getSettings() for maxBookingsPerDay
 *   6. Data calls: all 8 aggregation functions in parallel
 *   7. Return: AnalyticsResult<AnalyticsResponse>
 *
 * Failure modes (all return { success: false, error }):
 * - Zod parse error → first issue message (Spanish)
 * - No session       → "No autorizado"
 * - PATIENT role     → "No autorizado"
 * - Prisma error     → "Database error: failed to fetch analytics"
 *
 * Spec: openspec/changes/analytics/specs/analytics-actions/spec.md
 *   — ANA-001 (getAnalyticsAction), ANA-002 (Role Resolution),
 *     ANA-003 (Error Handling), ANA-004 (PATIENT Blocked).
 *
 * Design: openspec/changes/analytics/design.md — Action layer.
 */

import { headers } from "next/headers";

import { auth } from "@/core/auth";
import { USER_ROLE } from "@/modules/auth/domain";
import { getOrganizationId } from "@/modules/dashboard/data/get-organization-id";
import { getSettings } from "@/modules/settings/data/settings-data";
import { SETTINGS_DEFAULTS } from "@/modules/settings/domain/constants";

import {
  getBookingMetrics,
  getDayDistribution,
  getOccupancyMetrics,
  getPatientMetrics,
  getPeakHours,
  getRevenueMetrics,
  getTopProfessionals,
  getTopServices,
} from "../data/analytics-data";
import { analyticsQuerySchema } from "../domain/schemas";
import type { AnalyticsResponse } from "../domain/types";
import type { AnalyticsQueryInput, AnalyticsResult } from "./analytics-actions.types";

// ---------------------------------------------------------------------------
// getAnalyticsAction — single entry point for all analytics data
// ---------------------------------------------------------------------------

/**
 * Fetch all analytics metrics for the current user's organization.
 *
 * RBAC:
 * - PATIENT → blocked immediately
 * - PROFESSIONAL → professionalUserId auto-injected from session
 * - ADMIN/SECRETARY → org-wide, optional professionalUserId filter
 */
export async function getAnalyticsAction(
  input: AnalyticsQueryInput,
): Promise<AnalyticsResult<AnalyticsResponse>> {
  // 1. Zod 4 validation
  const parsed = analyticsQuerySchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Datos inválidos",
    };
  }

  const { dateRange, professionalUserId: manualProfessionalId } = parsed.data;

  // 2. Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  // 3. RBAC
  const { role, id: userId } = session.user;

  // PATIENT is blocked at the action level (defense-in-depth).
  if (role === USER_ROLE.PATIENT) {
    return { success: false, error: "No autorizado" };
  }

  // PROFESSIONAL: auto-inject their own userId, ignore any manual param.
  // ADMIN/SECRETARY: use manual param if provided, otherwise org-wide.
  const professionalUserId =
    role === USER_ROLE.PROFESSIONAL ? userId : manualProfessionalId;

  // 4-6. Org + Settings + Data — wrapped in try/catch for graceful errors.
  try {
    const organizationId = await getOrganizationId();

    // Settings resolution (for maxBookingsPerDay in occupancy)
    const settings = await getSettings(organizationId);
    const maxBookingsPerDay =
      settings?.maxBookingsPerDay ?? SETTINGS_DEFAULTS.maxBookingsPerDay;

    // Data calls — all 8 aggregation functions in parallel.
    const [
      revenue,
      bookings,
      occupancy,
      patients,
      topServices,
      topProfessionals,
      peakHours,
      dayDistribution,
    ] = await Promise.all([
      getRevenueMetrics(organizationId, dateRange, professionalUserId),
      getBookingMetrics(organizationId, dateRange, professionalUserId),
      getOccupancyMetrics(
        organizationId,
        dateRange,
        maxBookingsPerDay,
        professionalUserId,
      ),
      getPatientMetrics(organizationId, dateRange, professionalUserId),
      getTopServices(organizationId, dateRange, professionalUserId),
      getTopProfessionals(organizationId, dateRange, professionalUserId),
      getPeakHours(organizationId, dateRange, professionalUserId),
      getDayDistribution(organizationId, dateRange, professionalUserId),
    ]);

    // 7. Return typed response
    return {
      success: true,
      data: {
        revenue,
        bookings,
        occupancy,
        patients,
        topServices,
        topProfessionals,
        peakHours,
        dayDistribution,
      },
    };
  } catch {
    // ANA-003: errors → graceful "Database error: ..." — never expose stack traces.
    return {
      success: false,
      error: "Database error: failed to fetch analytics",
    };
  }
}
