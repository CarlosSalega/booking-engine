/**
 * Settings data layer — public types.
 *
 * These types are the contract between the data layer and its callers
 * (Server Components, Server Actions, tests). The data layer is pure:
 * no React, no Next.js, no auth wiring here. Every function takes an
 * `organizationId` so the queries are tenant-scoped.
 *
 * `OrganizationSettings` mirrors the persisted Prisma row (1:1 with the
 * domain `organizationSettingsSchema` inferred type). `OrganizationSettingsInput`
 * is the same shape minus the server-managed columns (`id`, `createdAt`,
 * `updatedAt`) so callers can pass partial updates.
 *
 * `SettingsRepository` is the dependency-inversion interface the data
 * layer implements. Tests can swap it for an in-memory implementation;
 * actions consume the interface, not the concrete Prisma functions.
 */

import type { OrganizationSettings as DomainOrganizationSettings } from "../domain/settings.schema";

// ---------------------------------------------------------------------------
// Persisted shape
// ---------------------------------------------------------------------------

/**
 * Full `OrganizationSettings` row, matching the Prisma model. The
 * domain `organizationSettingsSchema` is the Zod source of truth — this
 * type is kept in sync (re-exported from the inferred type) so callers
 * importing from the data layer see a stable surface.
 */
export type OrganizationSettings = DomainOrganizationSettings;

/**
 * Input payload for creating or updating settings. Omits the
 * server-managed columns (`id`, `createdAt`, `updatedAt`). All other
 * fields are optional because the data layer's `upsert` spreads
 * `SETTINGS_DEFAULTS` into the create payload.
 *
 * `organizationId` is REQUIRED on create (it's the natural key) and
 * ignored on update (Prisma's `where: { organizationId }` is the
 * lookup).
 */
export type OrganizationSettingsInput = Omit<
  OrganizationSettings,
  "id" | "createdAt" | "updatedAt"
>;

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

/**
 * Repository contract for the settings data layer. The data layer
 * implements this with Prisma; tests can swap in an in-memory fake.
 */
export interface SettingsRepository {
  /**
   * Fetch the settings row for an organization, or `null` when the org
   * has no settings yet (greenfield table).
   */
  getByOrgId(orgId: string): Promise<OrganizationSettings | null>;

  /**
   * Atomically create (if missing) or update (if present) the settings
   * row for an organization. On create, all fields are filled from
   * `SETTINGS_DEFAULTS` except those explicitly provided. On update,
   * only the provided fields are written.
   *
   * Always returns the post-write row.
   */
  upsertSettings(
    orgId: string,
    data: Partial<OrganizationSettingsInput>,
  ): Promise<OrganizationSettings>;
}
