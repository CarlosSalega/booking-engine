/**
 * getOrganizationId — resolves the current user's organization.
 *
 * The auth model does not yet carry an `organizationId` on the User row
 * (multi-tenant org membership is a future change), so we resolve the
 * active organization by looking at the first professional record in
 * the database. The seed script creates a single organization, so this
 * matches the seeded data exactly.
 *
 * Cached at the module level for the lifetime of the Node process — the
 * seed data is idempotent and we don't expect organizations to be
 * created at runtime yet.
 *
 * Behavior:
 * - If the request has no session → redirects to /login.
 * - If the database has no organization → throws a clear error
 *   (the operator must run the seed).
 * - Otherwise → returns the cached organizationId.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { prisma } from "@/lib/prisma";

let cachedOrgId: string | null = null;

export async function getOrganizationId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

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
