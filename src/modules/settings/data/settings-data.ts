/**
 * Settings data provider.
 *
 * Server-only data access for the settings module. Every function takes
 * an `organizationId` so the queries are tenant-scoped — the settings
 * module must NEVER see data from a different organization.
 *
 * Conventions (mirrors `src/modules/services/data/service-data.ts`):
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current
 *   `organizationId` (see `getOrganizationId()` in the dashboard
 *   module) AND for RBAC checks; this layer just scopes by org.
 * - `upsertSettings` is the single write path — first call creates
 *   with `SETTINGS_DEFAULTS` spread, subsequent calls update only
 *   the provided fields. Prisma's `upsert` with
 *   `where: { organizationId }` is the implementation.
 * - `getSettings(orgId)` is the cached read path — a `"use cache"`
 *   wrapper around `getByOrgId` that tags with `"settings"` and applies
 *   a 300s `cacheLife`. Server Actions call `updateTag("settings")`
 *   on every successful write for SWR background revalidation.
 *
 * Why `Omit` for the data args: the domain has `OrganizationSettings`
 * with `id` / `createdAt` / `updatedAt`; the data layer treats those
 * as server-managed and accepts everything else.
 */

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";

import { SETTINGS_DEFAULTS } from "../domain/constants";
import type { OrganizationSettings, OrganizationSettingsInput } from "./settings-data.types";

// ---------------------------------------------------------------------------
// getByOrgId — single row, scoped to the org. Null on missing row.
// ---------------------------------------------------------------------------

/**
 * Fetch the settings row for an organization. Returns `null` when no
 * row exists yet (greenfield table). The Prisma unique constraint on
 * `organizationId` makes a `findUnique` safe; there is no risk of
 * returning a row from a different org.
 */
export async function getByOrgId(
  orgId: string,
): Promise<OrganizationSettings | null> {
  const row = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
  });
  return (row ?? null) as OrganizationSettings | null;
}

// ---------------------------------------------------------------------------
// upsertSettings — create (first call) or update (subsequent). The
// `create` branch spreads `SETTINGS_DEFAULTS` so the row is fully
// populated on first write; the `update` branch is partial — only
// the caller-provided fields are written, preserving everything else.
// ---------------------------------------------------------------------------

/**
 * Atomically create (if missing) or update (if present) the settings
 * row for an organization. On create, every field that the caller did
 * NOT provide falls back to `SETTINGS_DEFAULTS`. On update, only the
 * provided fields are written — the rest of the row is preserved.
 *
 * Returns the post-write row.
 *
 * Tenant scoping: the upsert key is `organizationId`. Cross-tenant
 * updates are impossible because the `where` clause is bound to the
 * caller's `orgId`.
 */
export async function upsertSettings(
  orgId: string,
  data: Partial<OrganizationSettingsInput>,
): Promise<OrganizationSettings> {
  // Build the `create` payload: orgId + SETTINGS_DEFAULTS, then
  // overlay the caller's partial. Caller-supplied fields WIN over
  // defaults. `id` / `createdAt` / `updatedAt` are server-managed.
  const createPayload: Record<string, unknown> = {
    organizationId: orgId,
    ...SETTINGS_DEFAULTS,
    ...data,
  };

  // The `update` payload is just the caller's partial — Prisma
  // performs a partial update, leaving unspecified columns untouched.
  // This is what makes "preserves unchanged fields" work on the
  // second-and-later call.
  const updatePayload: Record<string, unknown> = { ...data };

  const row = await prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    create: createPayload as OrganizationSettingsInput,
    update: updatePayload,
  });

  return row as OrganizationSettings;
}

// ---------------------------------------------------------------------------
// getSettings — cached read path. A thin `"use cache"` wrapper around
// `getByOrgId(orgId)` that tags the entry with `"settings"` and applies
// a 300s `cacheLife`. The Server Actions invalidate this tag with
// `updateTag("settings")` on every successful write (SWR).
//
// Why wrap instead of tagging `getByOrgId` directly: the underlying
// `findUnique` is also called from the data-layer's own tests
// (uncached, deterministic) and from any future background job that
// must NOT use the request-scoped cache. Splitting the two keeps the
// uncached path available without forcing every caller to opt out.
// ---------------------------------------------------------------------------

/**
 * Cached read of the settings row for an organization. Returns `null`
 * when no row exists yet (greenfield table). Cache directives:
 * - `"use cache"` (build-time hint to the Next bundler)
 * - `cacheTag("settings")` — invalidated by every `updateTag("settings")`
 *   call in the Server Actions (`updateBusiness`, `updateBookings`,
 *   `updateCancellations`).
 * - `cacheLife({ revalidate: 300 })` — fresh for 5 minutes, then
 *   stale-while-revalidate in the background.
 *
 * Tenant scoping: forwarded to `getByOrgId(orgId)`. The cache key is
 * derived from the function arguments by Next, so calls with different
 * `orgId` values produce different cache entries.
 */
export async function getSettings(
  orgId: string,
): Promise<OrganizationSettings | null> {
  "use cache";
  cacheTag("settings");
  cacheLife({ revalidate: 300 });

  return getByOrgId(orgId);
}
