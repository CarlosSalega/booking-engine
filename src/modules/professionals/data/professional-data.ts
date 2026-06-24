/**
 * Professionals data provider.
 *
 * Server-only data access for the professionals module. Every function
 * takes an `organizationId` so the queries are tenant-scoped — the
 * professionals module must NEVER see data from a different organization.
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current `organizationId`
 *   (see `getOrganizationId()` in the dashboard module) AND for RBAC
 *   checks; this layer just scopes by org.
 * - Flatten-on-read DTO: `EnrichedProfessional` is built by joining
 *   Professional with User (identity: name, email, image) — the domain
 *   type already carries the flattened fields, the data layer wires
 *   the Prisma `include` to populate them.
 * - Writes are split across User + Professional in `$transaction` to
 *   keep the two tables consistent. `createProfessional` creates the
 *   User row first (role=PROFESSIONAL), then the Professional row.
 *   `updateProfessional` updates User (name/email) + Professional
 *   (specialties/license/bio/status) atomically.
 * - P2025 (record-not-found) on `updateProfessional` is caught and
 *   re-thrown as `ProfessionalNotFoundError` so the action layer can
 *   distinguish "not found" (404) from "updated" (200).
 */

import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/generated/prisma/client";

import type { ProfessionalStatusType } from "../domain/professional";
import {
  DEFAULT_PAGE_SIZE,
  type CreateProfessionalInput,
  type EnrichedProfessional,
  type PaginatedProfessionals,
  type ProfessionalFilters,
  type UpdateProfessionalInput,
} from "./professional-data.types";

// ---------------------------------------------------------------------------
// Shared Prisma `include` — single source of truth for the list/detail shape.
// We pull the User identity fields so we can flatten them into the
// `fullName` / `email` / `image` fields on `EnrichedProfessional`.
// ---------------------------------------------------------------------------

const PROFESSIONAL_INCLUDE = {
  user: { select: { name: true, email: true, image: true } },
} satisfies Prisma.ProfessionalInclude;

type ProfessionalWithUser = Prisma.ProfessionalGetPayload<{
  include: typeof PROFESSIONAL_INCLUDE;
}>;

// ---------------------------------------------------------------------------
// ProfessionalNotFoundError — thrown by updateProfessional when the
// professional does not exist in the given organization. The action
// layer maps this to a Spanish "Profesional no encontrado" result. We
// throw instead of returning null so the action can distinguish "not
// found" (404) from "updated" (200).
// ---------------------------------------------------------------------------

export class ProfessionalNotFoundError extends Error {
  constructor(message = "Professional not found") {
    super(message);
    this.name = "ProfessionalNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// mapToEnrichedProfessional — flatten Professional + User into the
// domain DTO shape. User.image is `String?` in Prisma; the domain
// schema treats it as optional and accepts `undefined` or `null`.
// ---------------------------------------------------------------------------

function mapToEnrichedProfessional(
  professional: ProfessionalWithUser,
): EnrichedProfessional {
  return {
    id: professional.id,
    organizationId: professional.organizationId,
    userId: professional.userId,
    fullName: professional.user.name,
    email: professional.user.email,
    image: professional.user.image ?? undefined,
    specialties: professional.specialties,
    license: professional.license ?? undefined,
    bio: professional.bio ?? undefined,
    status: professional.status as ProfessionalStatusType,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// getProfessionals — paginated, filtered, tenant-scoped.
// ---------------------------------------------------------------------------

/**
 * List professionals for an organization with optional filters and pagination.
 *
 * @param organizationId Tenant scope.
 * @param filters Optional filters (status, search, page, pageSize).
 */
export async function getProfessionals(
  organizationId: string,
  filters: ProfessionalFilters = {},
): Promise<PaginatedProfessionals> {
  const { status, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.ProfessionalWhereInput = { organizationId };

  if (status) {
    where.status = status;
  }
  if (search && search.trim().length > 0) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      include: PROFESSIONAL_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.professional.count({ where }),
  ]);

  return {
    professionals: professionals.map(mapToEnrichedProfessional),
    total,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// getProfessionalById — full detail with User flattening. Null when
// missing/wrong org (the WHERE clause makes them indistinguishable).
// ---------------------------------------------------------------------------

/**
 * Fetch a single professional by id, scoped to the organization. Returns
 * `null` when the professional doesn't exist OR belongs to a different org.
 */
export async function getProfessionalById(
  organizationId: string,
  id: string,
): Promise<EnrichedProfessional | null> {
  const professional = await prisma.professional.findFirst({
    where: { id, organizationId },
    include: PROFESSIONAL_INCLUDE,
  });

  if (!professional) {
    return null;
  }

  return mapToEnrichedProfessional(professional);
}

// ---------------------------------------------------------------------------
// createProfessional — split write inside $transaction.
// ---------------------------------------------------------------------------

/**
 * Create a new professional. Writes are split across the User table
 * (Better Auth identity: name, email, role=PROFESSIONAL) and the
 * Professional table (business data: specialties, license, bio, status)
 * inside a single `$transaction` so the two records stay consistent.
 *
 * The caller is responsible for RBAC checks before calling this; the
 * data layer does not import auth. Prisma P2002 (email uniqueness) is
 * propagated to the caller — the action layer maps it to a user-facing
 * "El email ya está registrado" result.
 */
export async function createProfessional(
  organizationId: string,
  data: CreateProfessionalInput,
): Promise<EnrichedProfessional> {
  const professional = await prisma.$transaction(async (tx) => {
    // 1. Create the User record (Better Auth identity)
    const user = await tx.user.create({
      data: {
        name: data.fullName,
        email: data.email,
        role: "PROFESSIONAL",
      },
    });

    // 2. Create the Professional record (business data)
    return tx.professional.create({
      data: {
        organizationId,
        userId: user.id,
        specialties: data.specialties,
        license: data.license ?? null,
        bio: data.bio ?? null,
        status: data.status,
      },
      include: PROFESSIONAL_INCLUDE,
    });
  });

  return mapToEnrichedProfessional(professional);
}

// ---------------------------------------------------------------------------
// updateProfessional — split write inside $transaction. Throws
// ProfessionalNotFoundError when the professional doesn't exist in the
// org. Catches Prisma P2025 to translate race conditions (record deleted
// between the findFirst check and the update) into the same error.
// ---------------------------------------------------------------------------

/**
 * Update an existing professional. The User row is updated only when
 * `fullName` or `email` is provided; the Professional row is updated
 * only with the fields that were passed. Both writes happen in a single
 * `$transaction` so a failure rolls back cleanly.
 *
 * Throws `ProfessionalNotFoundError` when the professional is missing
 * or in a different organization — the action maps this to a user-facing
 * "Profesional no encontrado" error. Prisma P2025 from the underlying
 * `update` is also caught and re-thrown as `ProfessionalNotFoundError`.
 *
 * Optional fields (`license`, `bio`) accept `null` to clear the stored
 * value; `undefined` is treated as "do not touch" and the stored value
 * is preserved.
 */
export async function updateProfessional(
  organizationId: string,
  id: string,
  data: UpdateProfessionalInput,
): Promise<EnrichedProfessional> {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // First, find the professional and its linked userId — scoped to org.
      const existing = await tx.professional.findFirst({
        where: { id, organizationId },
        select: { userId: true },
      });
      if (!existing) {
        throw new ProfessionalNotFoundError();
      }

      // Update User name/email if provided.
      if (data.fullName !== undefined || data.email !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.fullName !== undefined ? { name: data.fullName } : {}),
            ...(data.email !== undefined ? { email: data.email } : {}),
          },
        });
      }

      // Update Professional fields. Only the fields that were passed are
      // set — undefined values are skipped to avoid overwriting stored data.
      // `null` is passed through to clear the stored value.
      return tx.professional.update({
        where: { id },
        data: {
          ...(data.specialties !== undefined
            ? { specialties: data.specialties }
            : {}),
          ...(data.license !== undefined ? { license: data.license } : {}),
          ...(data.bio !== undefined ? { bio: data.bio } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
        include: PROFESSIONAL_INCLUDE,
      });
    });

    return mapToEnrichedProfessional(updated);
  } catch (error) {
    // Translate Prisma P2025 (record-not-found on update) into our domain
    // error so the action layer has a single error type to handle.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      throw new ProfessionalNotFoundError();
    }
    throw error;
  }
}
