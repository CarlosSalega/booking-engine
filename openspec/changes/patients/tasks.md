# Tasks: Patients Application + Presentation Layers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1180 (3 PRs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 Data+Migration → PR #2 Actions → PR #3 Pages+Bookings |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Data + migration + domain | PR #1 | base: `main`, ~350 lines |
| 2 | 3 actions + schemas + types | PR #2 | base: `main` (stacked), ~380 lines |
| 3 | Pages + components + bookings | PR #3 | base: `main` (stacked), ~450 lines |

## Phase 1: PR #1 — Data Layer + Migration + Domain

- [x] 1.1 [TEST RED] Failing tests: `createdByUserId` UUID in `patientSchema`; `patientDataSchema.strict()` rejects it.
- [x] 1.2 [IMPL GREEN] Add `createdByUserId: z.uuid(...)` to `patientSchema` in `src/modules/patients/domain/patient.schema.ts`.
- [x] 1.3 [MIGRATION] Add `documentId String?` + `createdByUserId String` (no `@relation`) + 2 indexes to Patient in `prisma/schema.prisma`; `pnpm prisma migrate dev --name add_patient_document_and_audit`.
- [x] 1.4 [TEST RED] Failing tests in `patient-data.test.ts`: getPatients (status/search/pagination/wrong-org/overflow), getPatientById (enriched/null), createPatient (transaction + audit), updatePatient (split + not-found). Mock `@/lib/prisma`.
- [x] 1.5 [IMPL GREEN] Create `patient-data.types.ts`: `EnrichedPatient`, `PatientFilters`, `PaginatedPatients`, `DEFAULT_PAGE_SIZE=20`.
- [x] 1.6 [IMPL GREEN] Create `patient-data.ts`: `PATIENT_INCLUDE`, `mapToEnrichedPatient`, 4 functions, `PatientNotFoundError`. Use `$transaction` for writes.
- [x] 1.7 [BARREL] Re-export `./data/patient-data` + `./data/patient-data.types` from `src/modules/patients/index.ts`.
- [x] 1.8 [VERIFY] `pnpm test` + `pnpm type-check` green.

## Phase 2: PR #2 — Server Actions

- [x] 2.1 [TEST RED] Failing tests in `create-patient.test.ts`: success, dedup match, P2002, PATIENT RBAC, invalid input, no session.
- [x] 2.2 [IMPL GREEN] Create `patient-actions.schema.ts` (3 Zod 4 schemas, Spanish errors).
- [x] 2.3 [IMPL GREEN] Create `patient-actions.types.ts`: `PatientResult<T>` discriminated union + 3 inferred input types.
- [x] 2.4 [IMPL GREEN] Create `create-patient.action.ts`: safeParse → session → RBAC → orgId → `$transaction` with `patientMatches` dedup → catch P2002/DedupError → revalidatePath → return `PatientResult<{id}>`.
- [x] 2.5 [TEST RED] Failing tests in `update-patient.test.ts`: success, not-found, wrong-org, bad UUID, P2002, PATIENT RBAC.
- [x] 2.6 [IMPL GREEN] Create `update-patient.action.ts`: validate → RBAC → org scope → `$transaction` User+Patient update → catch P2025/P2002 → revalidatePath.
- [x] 2.7 [TEST RED] Failing tests in `change-patient-status.test.ts`: valid, bad enum, not-found, wrong-org, PATIENT RBAC.
- [x] 2.8 [IMPL GREEN] Create `change-patient-status.action.ts`: validate id+enum → RBAC → `prisma.patient.update` → revalidatePath.
- [x] 2.9 [BARREL] Create `actions/index.ts` exporting schemas, types, 3 actions.
- [x] 2.10 [VERIFY] `pnpm test` + `pnpm type-check` green.

## Phase 3: PR #3 — Pages + Components + Bookings Extension

- [x] 3.1 [TEST RED] Failing test `patient-status-badge.test.tsx`: ACTIVE→green "Activo", INACTIVE→gray "Inactivo", BLOCKED→red "Bloqueado".
- [x] 3.2 [IMPL GREEN] Create `presentation/formatters.ts` (`getPatientStatusLabel`, `formatPatientName`) + `presentation/index.ts`.
- [x] 3.3 [IMPL GREEN] Create `patient-status-badge.tsx` (shadcn Badge variants).
- [x] 3.4 [TEST RED] Failing tests `patient-form.test.tsx`: pre-fill, empty fullName, bad email, bad documentId, notes>1000, valid submit.
- [x] 3.5 [IMPL GREEN] Create `patient-table.tsx` (Client, shadcn Table, 6 columns + action).
- [x] 3.6 [IMPL GREEN] Create `patient-detail.tsx` (Client): info cards, audit, status dropdown wired to `changePatientStatus`, edit button, booking history.
- [x] 3.7 [IMPL GREEN] Create `patient-form.tsx` (Client): Zod 4 client validation, `useActionState`, redirect on success, inline errors.
- [x] 3.8 [IMPL GREEN] Create `app/(dashboard)/dashboard/patients/page.tsx` (Server): PageHeader, filters, `<Suspense>` + `PatientTableDataWrapper` async, `PatientEmptyState`.
- [x] 3.9 [IMPL GREEN] Create `app/(dashboard)/dashboard/patients/[id]/page.tsx`: getPatientById → notFound() → `<PatientDetail>` + bookings.
- [x] 3.10 [IMPL GREEN] Create `app/(dashboard)/dashboard/patients/[id]/edit/page.tsx`: Server wrapper + `<PatientForm>` Client.
- [x] 3.11 [EXTEND] Add `patientId?: string` to `BookingFilters`; add `if (patientId) where.patientId = patientId` in `getBookings`.
- [x] 3.12 [BARREL] Re-export `./actions` + `./presentation` from `src/modules/patients/index.ts`.
- [x] 3.13 [VERIFY] `pnpm test`, `pnpm type-check`, `pnpm lint` green; manual smoke test 3 routes.

## Dependencies

Phase 2 depends on Phase 1 (data layer exports + domain `createdByUserId`). Phase 3 depends on Phase 2 (actions used by form) + Phase 1 (`getPatientById` in detail/edit).
