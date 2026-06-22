# Proposal: Patients Application + Presentation Layers

## Intent

The sidebar links to `/dashboard/patients` but the route is a 404. The domain layer (entity, Zod 4 schemas, `patientMatches` dedup) is complete but has zero consumers. Staff cannot list, create, view, or edit patients. This change builds the data access, server actions, and UI so authenticated staff (all roles except PATIENT) can manage patients with full audit trail.

## Scope

### In Scope

1. **Migration**: add `documentId String?` + `createdByUserId String` to Prisma Patient model
2. **Data layer** (`src/modules/patients/data/`): `getPatients(filters)`, `getPatientById(id)`, `createPatient(data, createdByUserId)`, `updatePatient(id, data)` — flatten-on-read JOIN Patient+User → domain DTO
3. **Server actions** (`src/modules/patients/actions/`): `createPatient` (with dedup via `patientMatches`), `updatePatient`, `changePatientStatus` — all with RBAC (reject PATIENT role), Zod 4 input validation, `PatientResult<T>` discriminated union
4. **List page** (`/dashboard/patients`): Server Component with Suspense, DataTable with search + status filter, status badges
5. **Detail page** (`/dashboard/patients/[id]`): patient card + audit display ("Creado por {userName}") + booking history table
6. **Edit page** (`/dashboard/patients/[id]/edit`): form with status change
7. **Bookings data extension**: add `patientId` filter to `getBookings` (backwards-compatible)
8. **Tests**: data layer + actions (Vitest, follow bookings TDD pattern)

### Out of Scope

- Patient self-registration portal (PATIENT role views)
- Bulk import / CSV export
- Patient merge/deduplication UI
- Document upload (medical records)
- Calendar/schedule view

## Capabilities

### New Capabilities

- `patients-data`: Prisma data access — paginated list with filters, detail, create (with dedup + audit), update. Flatten-on-read DTO mapping Patient+User→domain shape.
- `patients-actions`: Server actions for create, update, status change with RBAC (all roles except PATIENT), Zod 4 input validation, `patientMatches` dedup check on create.
- `patients-list`: List page at `/dashboard/patients` with search, status filter, DataTable, status badges (Activo/Inactivo/Bloqueado).
- `patients-detail`: Detail page with patient card, audit trail (createdBy), and booking history table.
- `patients-edit`: Edit page with form, status change action.

### Modified Capabilities

- `patients-domain`: Add `createdByUserId` to Patient type and schemas. `documentId` now backed by Prisma column (no schema change needed — already in domain). Add `createdByUserId String` field to domain type.
- `bookings-data`: Add `patientId` filter to `BookingFilters` and `getBookings` where clause (backwards-compatible, default undefined).

## Approach

- **Flatten-on-read DTO**: Data layer joins Patient+User, maps `{user.name→fullName, user.email→email, patient.*→rest}` to produce domain `Patient` shape. Writes split across both tables in `$transaction`.
- **Create flow**: `$transaction` — create User (name, email, role=PATIENT) → create Patient (with `createdByUserId`, `documentId`). Dedup check via `patientMatches` against existing org patients before insert. Catch P2002 for email uniqueness.
- **Migration**: `documentId String?` + `createdByUserId String` on Patient. `createdByUserId` references User but is NOT a Prisma relation (audit FK, no cascade semantics needed — just a string column).
- **RBAC**: Actions call `getOrganizationId()` + check session role. Reject if `role === "PATIENT"`. All other roles (ADMIN, SECRETARY, PROFESSIONAL) can create/edit.
- **Booking history**: Extend `BookingFilters` with optional `patientId`. Detail page calls `getBookings(orgId, { patientId })` — zero changes to existing callers.
- **Presentation**: es-AR formatters, shadcn/ui DataTable, Suspense boundaries, Skeleton loaders.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `documentId String?`, `createdByUserId String` to Patient |
| `src/modules/patients/data/` | New | 4 data functions + types + tests |
| `src/modules/patients/actions/` | New | 3 server actions + schemas + types + tests |
| `src/modules/patients/domain/patient.ts` | Modified | Add `createdByUserId` to constants/type |
| `src/modules/patients/domain/patient.schema.ts` | Modified | Add `createdByUserId` field |
| `src/modules/patients/presentation/` | New | es-AR formatters |
| `src/app/(dashboard)/dashboard/patients/` | New | 3 route pages: list, detail, edit |
| `src/components/patients/` | New | Table, status-badge, detail, form |
| `src/modules/bookings/data/booking-data.types.ts` | Modified | Add `patientId` to `BookingFilters` |
| `src/modules/bookings/data/booking-data.ts` | Modified | Add `patientId` where clause |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `createdByUserId` as plain String (no FK relation) — orphaned refs if user deleted | Low | Audit-only field; display "Desconocido" if user not found. No cascade needed. |
| Dedup check race on concurrent create | Low | `patientMatches` runs in-memory after fetch; wrap check+insert in `$transaction`. Exact same pattern as bookings overlap check. |
| Migration adds non-null `createdByUserId` to existing rows | Med | Default to seed admin user ID for existing patients. Use two-step migration: add nullable → backfill → make required. |
| Bookings filter extension breaks existing callers | Low | `patientId` is optional, defaults to undefined. Existing callers pass no change. |

## Rollback Plan

1. Migration: `createdByUserId` is additive. `documentId` is additive nullable. Revert migration drops both columns — no data loss for existing functionality.
2. New routes (`/dashboard/patients/*`) are purely additive — remove to rollback UI.
3. Server actions are new — no existing callers.
4. Bookings `patientId` filter: remove optional param — backwards-compatible revert.

## Dependencies

- `getOrganizationId()` from dashboard module (exists)
- `auth.api.getSession()` for RBAC (exists)
- `patientMatches` from domain (exists)
- `getBookings` from bookings data layer (exists, needs `patientId` filter addition)
- Prisma models: Patient, User, Booking (exist)
- No new npm packages

## Success Criteria

- [ ] All authenticated staff (except PATIENT role) can create patients with audit trail
- [ ] Dedup check prevents duplicate patients by name+email, name+phone, or documentId
- [ ] List page shows patients with search + status filter
- [ ] Detail page shows patient info + "Creado por" + booking history
- [ ] Edit page updates patient data and status
- [ ] `documentId` column exists and participates in dedup
- [ ] All data layer + action tests pass (Vitest)
- [ ] Each PR within review budget (3 chained PRs: ~350, ~250, ~300 lines)
