/**
 * getOrganizationId — resolves the current user's organization.
 *
 * The auth model does not yet carry an `organizationId` on the User row
 * (multi-tenant org membership is a future change), so we resolve the
 * active organization by looking at the first professional record in
 * the database. The seed script creates a single organization, so this
 * matches the seeded data exactly.
 *
 * Auth check is handled by the dashboard layout — by the time this
 * function runs the user is guaranteed to be signed in.
 *
 * Cached at the module level for the lifetime of the Node process — the
 * seed data is idempotent and we don't expect organizations to be
 * created at runtime yet.
 */

import { prisma } from "@/lib/prisma";

let cachedOrgId: string | null = null;

export async function getOrganizationId(): Promise<string> {
  if (cachedOrgId) {
    return cachedOrgId;
  }

  const professional = await prisma.professional.findFirst({
    select: { organizationId: true },
  });

  if (!professional) {
    throw new Error(
      "No organization found. Run `pnpm db:seed` to load the development fixture.",
    );
  }

  cachedOrgId = professional.organizationId;
  return cachedOrgId;
}

/**
 * Test-only helper — resets the module-level cache so tests can swap
 * the resolved organization between runs. Not exported in any barrel.
 */
export function __resetOrganizationIdCache(): void {
  cachedOrgId = null;
}
