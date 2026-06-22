# Exploration: Patients Module — Application + Presentation Layers

## Current State

### What EXISTS (domain layer — complete)

| Artifact | Path | Contents |
|----------|------|----------|
| Patient entity | `src/modules/patients/domain/patient.ts` | `PatientStatus` (ACTIVE/INACTIVE/BLOCKED), `patientMatches` dedup (name+email OR name+phone OR documentId) |
| Zod 4 schemas | `src/modules/patients/domain/patient.schema.ts` | `patientSchema` (flat: fullName, email, phone, documentId, status, notes), `patientDataSchema` (omit id/createdAt/updatedAt, strict) |
| Domain tests | `src/modules/patients/domain/__tests__/` | Schema validation + patientMatches behavior |
| Module barrel | `src/modules/patients/domain/index.ts` | Re-exports patient + patient.schema |
| Prisma model | `prisma/schema.prisma` | `Patient` with `userId @unique → User`, orgId, status, phone, address, dateOfBirth, notes. Indexes on orgId, status |
| Seed data | `prisma/seed.ts` | 5 patients (4 ACTIVE, 1 BLOCKED), linked to User records |
| Sidebar link | `src/components/dashboard/sidebar.tsx:98` | `/dashboard/patients` (currently 404) |
| Existing spec | `openspec/specs/patients-domain/spec.md` | Domain-only spec (types, schemas, constants, scenarios) |

### CRITICAL — Schema mismatch (must resolve in data layer)

The Prisma `Patient` model stores identity via a `User` relation:
- Prisma: `Patient { userId, phone, address, dateOfBirth, notes, status }` + `User { name, email }`
- Domain: `Patient { fullName, email, phone, documentId, status, notes }`

The domain `Patient` type is a **flattened read-model DTO**, not a direct Prisma row. The data layer must:
- **Read**: join `Patient` + `User` and map `{ user.name → fullName, user.email → email, patient.* → rest }`
- **Write**: create/update `User` (name, email) + `Patient` (phone, address, dateOfBirth, notes, status) in a transaction
- **Dedup** (`patientMatches`): operates on the flattened shape — no changes needed

Note: `documentId` from the domain schema has no storage in Prisma. Either (a) defer dedup-by-documentId until a migration adds the column, or (b) store it in `User`/`Patient.notes` as a stopgap. Recommendation: **(a)** — document the gap, keep `patientMatches` signature unchanged, accept that documentId matches will no-op until the column exists.

### What is MISSING (the gap)

| Layer | What needs to be built |
|-------|------------------------|
| **Data access** | `getPatients` (paginated, filtered by status/search), `getPatientById`, `createPatient` (with dedup check), `updatePatient`, `changePatientStatus` |
| **Server Actions** | `createPatient`, `updatePatient`, `changePatientStatus` — following `BookingResult<T>` pattern (rename to `PatientResult<T>`) |
| **Action schemas** | Zod 4 input schemas for each action (Spanish error messages, per bookings convention) |
| **List page** | `/dashboard/patients` — table with search + status filter + create button |
| **Detail page** | `/dashboard/patients/[id]` — patient card + bookings list (read-only, via existing `getBookings({ patientId })` if added) |
| **Edit page** | `/dashboard/patients/[id]/edit` — form with status change |
| **Presentational components** | `PatientTable`, `PatientSearchBar`, `PatientFilters`, `PatientStatusBadge`, `PatientDetailCard`, `PatientForm` |
| **Module barrel** | Update `src/modules/patients/index.ts` to export data + actions + presentation |

### Why patients is SIMPLER than bookings

- No state machine — status is a 3-value enum, no transition rules
- No wizard — single create/edit form
- No availability/overlap logic — only dedup check on create
- No cross-module writes — patients don't create bookings/services/payments
- No time-bucketing, no pricing, no guest mode
- Pure CRUD + 1 status mutation

---

## Affected Areas

- `src/modules/patients/` — **EXPAND** with `data/`, `actions/`, `presentation/` subdirectories (mirroring bookings)
- `src/modules/patients/index.ts` — **NEW** barrel exporting all layers
- `src/app/(dashboard)/dashboard/patients/` — **NEW** route group: `page.tsx` (list), `[id]/page.tsx` (detail), `[id]/edit/page.tsx` (edit)
- `src/components/patients/` — **NEW** presentational components (table, filters, search, status badge, detail card, form)
- `prisma/schema.prisma` — **NO CHANGES** (model already has needed indexes; `documentId` gap documented as non-goal)
- `src/modules/patients/domain/` — **NO CHANGES** (domain layer is complete and correct)
- `src/components/dashboard/sidebar.tsx` — **NO CHANGES** (link already exists at line 98)

---

## Approaches

### 1. Flatten-on-read DTO (recommended)

Treat the domain `Patient` as a read-model. Data layer maps `Patient + User` → flat DTO on reads, and splits writes across both tables in a transaction.

- **Pros**: honors existing domain spec, keeps `patientMatches` unchanged, bookings already uses this shape via `BOOKING_INCLUDE.patient.user`
- **Cons**: create/update need a transaction; `documentId` has no storage (documented gap)
- **Effort**: Medium — one-time mapping boilerplate, then mechanical

### 2. Reshape domain to match Prisma

Rewrite `patientSchema` to use `userId` + nested `user: { name, email }`. Update `patientMatches` to read from nested shape.

- **Pros**: 1:1 with Prisma, no mapping layer
- **Cons**: breaks existing domain spec + tests, makes dedup logic uglier, diverges from bookings pattern (which uses flat DTOs)
- **Effort**: Medium — rewrite + retest domain, plus re-spec

### 3. Add `documentId` column to Patient now

Migration to add `documentId String?` + unique index to `Patient`.

- **Pros**: closes the dedup gap
- **Cons**: out of scope for this change (this is CRUD + UI), adds a migration that isn't needed for list/detail/edit
- **Effort**: Low alone, but scope creep for this change

**Recommendation: Approach 1.** Accept the `documentId` gap as a documented non-goal. The dedup function signature stays correct; it just won't match on documentId until a future change adds the column. This keeps the current change focused on CRUD + UI.

---

## Scope Breakdown (3 PRs)

### PR 1 — Data layer + Server Actions
- `src/modules/patients/data/patient-data.ts` — `getPatients`, `getPatientById`, `createPatient`, `updatePatient`, `changePatientStatus`
- `src/modules/patients/data/patient-data.types.ts` — `PatientFilters`, `PaginatedPatients`, `EnrichedPatient`, `DEFAULT_PAGE_SIZE`
- `src/modules/patients/data/__tests__/` — vitest unit tests with mocked prisma
- `src/modules/patients/actions/patient-actions.schema.ts` — Zod 4 input schemas (Spanish errors)
- `src/modules/patients/actions/patient-actions.types.ts` — `PatientResult<T>` discriminated union + inferred input types
- `src/modules/patients/actions/create-patient.action.ts` — with dedup check via `patientMatches` inside transaction
- `src/modules/patients/actions/update-patient.action.ts`
- `src/modules/patients/actions/change-patient-status.action.ts`
- `src/modules/patients/actions/__tests__/`
- `src/modules/patients/index.ts` — barrel export

### PR 2 — List page + presentational components
- `src/app/(dashboard)/dashboard/patients/page.tsx` — server component, searchParams, Suspense wrapper
- `src/components/patients/patient-table.tsx` + skeleton
- `src/components/patients/patient-search-bar.tsx`
- `src/components/patients/patient-filters.tsx` (status filter)
- `src/components/patients/patient-status-badge.tsx`
- `src/components/patients/patient-empty-state.tsx`
- `src/modules/patients/presentation/formatters.ts` — `getPatientStatusLabel`, date formatting

### PR 3 — Detail + Edit pages
- `src/app/(dashboard)/dashboard/patients/[id]/page.tsx` — detail view with patient card + recent bookings
- `src/app/(dashboard)/dashboard/patients/[id]/edit/page.tsx` — edit form (React Hook Form + Zod 4)
- `src/components/patients/patient-detail-card.tsx`
- `src/components/patients/patient-form.tsx` — reusable for create (future) + edit
- Status change action wired into detail page

---

## Risks

1. **`documentId` dedup gap** — `patientMatches` accepts documentId but the data layer can't compare it (no column). Until a migration adds it, dedup-by-documentId silently no-ops. Mitigation: document in PR 1's data-layer README comment + spec delta.

2. **User creation side-effect** — `createPatient` must create a `User` first (Better Auth's user table). This means the Patients module briefly knows about auth internals. Mitigation: isolate in a single `createUserForPatient` helper inside the action; don't import `auth` beyond what's needed for session.

3. **Email uniqueness** — `User.email` is `@unique`. Create flow must handle "email already in use by another User" gracefully (return a friendly error, not a Prisma crash). Mitigation: catch P2002 in the action, map to "Ya existe un paciente con ese email".

4. **Bookings cross-reference** — Detail page wants to show "recent bookings for this patient". The existing `getBookings` doesn't filter by `patientId`. Mitigation: add `patientId` to `BookingFilters` in PR 3 (small, backwards-compatible extension to bookings data layer).

5. **RBAC** — Who can create/edit patients? Bookings uses ADMIN/SECRETARY/PROFESSIONAL. Patients likely: ADMIN + SECRETARY (full), PROFESSIONAL (read-only for their own patients). Needs confirmation — default to ADMIN+SECRETARY write, everyone read.

---

## Dependencies

### Modules patients DEPENDS ON

| Module | What patients needs | State |
|--------|---------------------|-------|
| **auth** | `auth.api.getSession` + `getOrganizationId()` + RBAC roles | Complete |
| **bookings** (data) | Optional: filter bookings by `patientId` for detail page | Exists; needs small filter addition |

### Modules that DEPEND ON patients

| Module | What they need | State after this change |
|--------|----------------|--------------------------|
| **bookings** (wizard) | `getPatients(orgId, search)` for wizard step 4 | Already exists in `booking-data.ts` — no change needed, but could be moved to `patients/data` for ownership. **Non-goal for this change.** |

---

## Non-Goals (explicit)

- ❌ Calendar / schedule view (patients don't have one)
- ❌ Migration to add `documentId` column (separate change)
- ❌ Moving `getPatients` out of `booking-data.ts` into `patients/data` (refactor, separate change)
- ❌ Patient self-service portal (PATIENT role views) — out of scope
- ❌ Bulk import / CSV export
- ❌ Audit log for status changes

---

## Ready for Proposal

**Yes.** The pattern is fully established by bookings. The only architectural decision is Approach 1 (flatten-on-read DTO), which is forced by the existing domain spec + Prisma schema. Recommend the orchestrator proceed to `sdd-propose` with:

- Scope: 3 PRs as above
- Approach: flatten-on-read DTO, document `documentId` gap as non-goal
- RBAC default: ADMIN+SECRETARY write, all authenticated roles read (confirm with user)
- First artifact: proposal → spec delta → tasks → design
