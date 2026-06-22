/**
 * Patients data provider.
 *
 * Server-only data access for the patients module. Every function takes
 * an `organizationId` so the queries are tenant-scoped — the patients
 * module must NEVER see data from a different organization.
 *
 * Conventions:
 * - Pure data layer: no React, no Next.js, no auth wiring here.
 * - The caller is responsible for resolving the current `organizationId`
 *   (see `getOrganizationId()` in the dashboard module) AND for RBAC
 *   checks; this layer just scopes by org.
 * - Flatten-on-read DTO: `EnrichedPatient` is built by joining
 *   Patient with User (identity: name + email) and looking up the
 *   creator's name via a separate `user.findMany` (audit field).
 * - Writes are split across User + Patient in `$transaction` to keep
 *   the two tables consistent.
 */

import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/generated/prisma/client";

import type { PatientStatusType } from "../domain/patient";
import {
  DEFAULT_PAGE_SIZE,
  type CreatePatientInput,
  type EnrichedPatient,
  type PaginatedPatients,
  type PatientFilters,
  type UpdatePatientInput,
} from "./patient-data.types";

// ---------------------------------------------------------------------------
// Shared Prisma `include` — single source of truth for the list/detail shape.
// We only `include` the User relation that exists (identity). The creator
// audit name is fetched separately because `createdByUserId` is a plain
// string column with no Prisma relation (see migration AD2).
// ---------------------------------------------------------------------------

const PATIENT_INCLUDE = {
  user: { select: { name: true, email: true } },
} satisfies Prisma.PatientInclude;

type PatientWithUser = Prisma.PatientGetPayload<{
  include: typeof PATIENT_INCLUDE;
}>;

// ---------------------------------------------------------------------------
// PatientNotFoundError — thrown by updatePatient when the patient does not
// exist in the given organization. The action layer maps this to a Spanish
// "Paciente no encontrado" result. We throw instead of returning null so
// the action can distinguish "not found" (404) from "updated" (200).
// ---------------------------------------------------------------------------

export class PatientNotFoundError extends Error {
  constructor(message = "Patient not found") {
    super(message);
    this.name = "PatientNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Creator-name lookup
//
// `createdByUserId` is a plain string column (no Prisma relation), so we
// batch-fetch creator names separately. This keeps the data layer pure
// and avoids a second `@relation` on the User model (see migration AD2).
// ---------------------------------------------------------------------------

async function fetchCreatorNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) {
    return new Map();
  }
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}

// ---------------------------------------------------------------------------
// mapToEnrichedPatient — flatten Patient + User + creatorName into the
// domain DTO shape. Returns `createdByUserName: null` when the creator
// user has been deleted (orphan audit ref).
// ---------------------------------------------------------------------------

function mapToEnrichedPatient(
  patient: PatientWithUser,
  creatorNames: Map<string, string>,
): EnrichedPatient {
  return {
    id: patient.id,
    organizationId: patient.organizationId,
    fullName: patient.user.name,
    email: patient.user.email,
    phone: patient.phone ?? undefined,
    documentId: patient.documentId ?? undefined,
    status: patient.status as PatientStatusType,
    notes: patient.notes ?? undefined,
    createdByUserId: patient.createdByUserId,
    createdByUserName: creatorNames.get(patient.createdByUserId) ?? null,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// getPatients — paginated, filtered, tenant-scoped.
// ---------------------------------------------------------------------------

/**
 * List patients for an organization with optional filters and pagination.
 *
 * @param organizationId Tenant scope.
 * @param filters Optional filters (status, search, page, pageSize).
 */
export async function getPatients(
  organizationId: string,
  filters: PatientFilters = {},
): Promise<PaginatedPatients> {
  const { status, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.PatientWhereInput = { organizationId };

  if (status) {
    where.status = status;
  }
  if (search && search.trim().length > 0) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: PATIENT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  const creatorNames = await fetchCreatorNames(
    patients.map((p) => p.createdByUserId),
  );

  return {
    patients: patients.map((p) => mapToEnrichedPatient(p, creatorNames)),
    total,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// getPatientById — full detail with audit. Null when missing/wrong org.
// ---------------------------------------------------------------------------

/**
 * Fetch a single patient by id, scoped to the organization. Returns
 * `null` when the patient doesn't exist OR belongs to a different org
 * (the WHERE clause makes them indistinguishable — that's the point).
 */
export async function getPatientById(
  organizationId: string,
  id: string,
): Promise<EnrichedPatient | null> {
  const patient = await prisma.patient.findFirst({
    where: { id, organizationId },
    include: PATIENT_INCLUDE,
  });

  if (!patient) {
    return null;
  }

  const creatorNames = await fetchCreatorNames([patient.createdByUserId]);
  return mapToEnrichedPatient(patient, creatorNames);
}

// ---------------------------------------------------------------------------
// createPatient — split write inside $transaction.
// ---------------------------------------------------------------------------

/**
 * Create a new patient. Writes are split across the User table
 * (Better Auth identity: name, email, role=PATIENT) and the Patient
 * table (business data: phone, documentId, notes, status) inside a
 * single `$transaction` so the two records stay consistent.
 *
 * The caller is responsible for any dedup check before calling this
 * (use `patientMatches` from the domain layer).
 */
export async function createPatient(
  organizationId: string,
  data: CreatePatientInput,
  createdByUserId: string,
): Promise<EnrichedPatient> {
  const patient = await prisma.$transaction(async (tx) => {
    // 1. Create the User record (Better Auth identity)
    const user = await tx.user.create({
      data: {
        name: data.fullName,
        email: data.email,
        role: "PATIENT",
      },
    });

    // 2. Create the Patient record (business data + audit)
    return tx.patient.create({
      data: {
        organizationId,
        userId: user.id,
        createdByUserId,
        documentId: data.documentId,
        phone: data.phone,
        notes: data.notes,
        status: data.status,
      },
      include: PATIENT_INCLUDE,
    });
  });

  const creatorNames = await fetchCreatorNames([patient.createdByUserId]);
  return mapToEnrichedPatient(patient, creatorNames);
}

// ---------------------------------------------------------------------------
// updatePatient — split write inside $transaction. Throws
// PatientNotFoundError when the patient doesn't exist in the org.
// ---------------------------------------------------------------------------

/**
 * Update an existing patient. The User row is updated only when
 * `fullName` or `email` is provided; the Patient row is updated only
 * with the fields that were passed. Both writes happen in a single
 * `$transaction` so a failure rolls back cleanly.
 *
 * Throws `PatientNotFoundError` when the patient is missing or in a
 * different organization — the action maps this to a user-facing
 * "Paciente no encontrado" error.
 */
export async function updatePatient(
  organizationId: string,
  id: string,
  data: UpdatePatientInput,
): Promise<EnrichedPatient> {
  const updated = await prisma.$transaction(async (tx) => {
    // First, find the patient and its linked userId — scoped to org.
    const existing = await tx.patient.findFirst({
      where: { id, organizationId },
      select: { userId: true },
    });
    if (!existing) {
      throw new PatientNotFoundError();
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

    // Update Patient fields. Only the fields that were passed are set —
    // undefined values are skipped to avoid overwriting stored data.
    return tx.patient.update({
      where: { id },
      data: {
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.documentId !== undefined ? { documentId: data.documentId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: PATIENT_INCLUDE,
    });
  });

  const creatorNames = await fetchCreatorNames([updated.createdByUserId]);
  return mapToEnrichedPatient(updated, creatorNames);
}
