# Design: Patients Module — Application + Presentation Layers

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser                                                            │
│    │                                                                │
│    ├── GET /dashboard/patients ─────────────────────────────────┐   │
│    │   │                                                         │   │
│    │   ▼                                                         │   │
│    │   DashboardLayout (Server, RBAC gate)                       │   │
│    │   │  → auth.api.getSession()                                │   │
│    │   │  → PATIENT → redirect("/")                              │   │
│    │   │  → ADMIN / SECRETARY / PROFESSIONAL → render children   │   │
│    │   │                                                         │   │
│    │   └── PatientsPage (Server, async)                          │   │
│    │       │  → getOrganizationId()                              │   │
│    │       │  → searchParams: search, status, page               │   │
│    │       │  → passes filters + orgId to data layer             │   │
│    │       │                                                     │   │
│    │       ├── PatientSearchBar (Client)                          │   │
│    │       │  → text search input → updates URL searchParams      │   │
│    │       │                                                     │   │
│    │       ├── PatientStatusFilter (Client)                       │   │
│    │       │  → Select: Activo / Inactivo / Bloqueado             │   │
│    │       │  → updates URL searchParams                          │   │
│    │       │                                                     │   │
│    │       └── Suspense                                          │   │
│    │           └── PatientTableData (async Server wrapper)       │   │
│    │               │ → getPatients(orgId, filters)               │   │
│    │               │                                            │   │
│    │               └── PatientTable (Client)                     │   │
│    │                   ├── PatientStatusBadge (Client)           │   │
│    │                   └── Link → /dashboard/patients/[id]       │   │
│    │                                                             │   │
│    ├── POST (Server Action) createPatient ───────────────────────┤   │
│    │   │                                                         │   │
│    │   ▼                                                         │   │
│    │   "use server" → Zod validate → RBAC → $transaction        │   │
│    │   │  → create User (name, email, role="PATIENT")            │   │
│    │   │  → patientMatches dedup against org patients            │   │
│    │   │  → create Patient (linked to User, with createdByUserId)│   │
│    │   │  → catch P2002 for duplicate email                      │   │
│    │   │  → revalidatePath("/dashboard/patients")                │   │
│    │   │  → return PatientResult<{ id }>                         │   │
│    │   │                                                         │   │
│    │   ├── POST (Server Action) updatePatient ───────────────────┤   │
│    │   │  → Zod validate → RBAC → $transaction                   │   │
│    │   │  → update User (name, email) + Patient fields           │   │
│    │   │  → catch P2025 (not found)                              │   │
│    │   │  → revalidatePath("/dashboard/patients")                │   │
│    │   │  → return PatientResult<void>                           │   │
│    │   │                                                         │   │
│    │   └── POST (Server Action) changePatientStatus ─────────────┤   │
│    │       → Zod validate → RBAC → prisma.patient.update         │   │
│    │       → revalidatePath("/dashboard/patients")                │   │
│    │       → return PatientResult<void>                           │   │
│    │                                                              │   │
│    ├── GET /dashboard/patients/[id] ─────────────────────────────┤   │
│    │   │                                                          │   │
│    │   └── PatientDetailPage (Server, async)                      │   │
│    │       │  → getOrganizationId() + getPatientById(orgId, id)   │   │
│    │       │  → null → notFound() (404)                           │   │
│    │       │  → getBookings(orgId, { patientId })                 │   │
│    │       │                                                      │   │
│    │       └── PatientDetail (Client)                              │   │
│    │           ├── Info cards (fullName, email, phone, documentId) │   │
│    │           ├── PatientStatusBadge                              │   │
│    │           ├── "Creado por {createdByUserName}" audit          │   │
│    │           ├── StatusChangeDropdown → changePatientStatus      │   │
│    │           ├── BookingHistoryTable (reuses bookings table)     │   │
│    │           └── "Editar" button → /dashboard/patients/[id]/edit │   │
│    │                                                              │   │
│    └── GET /dashboard/patients/[id]/edit ────────────────────────┘   │
│        │                                                            │
│        └── PatientEditPage (Client, "use client")                   │
│            │  → getPatientById(id) — pre-fills form                 │
│            │                                                        │
│            └── PatientForm (Client)                                  │
│                ├── fields: fullName, email, phone, documentId, notes │
│                ├── client-side Zod 4 validation (Spanish errors)     │
│                ├── on submit: calls updatePatient Server Action      │
│                ├── success → redirect to detail page                 │
│                └── error → inline message                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principles:**
- **Server Components first**: list and detail pages are Server Components that fetch data and pass to Client Components.
- **Server Actions for mutations**: all CUD operations go through `"use server"` actions with Zod 4 validation and RBAC.
- **Data layer is pure**: no React/Next.js/auth imports — the caller resolves organization and role scoping.
- **Client Components for interactivity**: search bar, filters, table, status dropdown, form.
- **Flat domain DTO**: data layer joins Patient+User on read, producing the domain `Patient` shape directly. Writes split across both tables in `$transaction`.

---

## Decisions

### AD1: Data Access Layer — Flatten-on-Read DTO

**Decision**: Single file `patient-data.ts` with 4 pure async functions. Every function takes `organizationId` first. Reads JOIN Patient+User+createdByUser → flat `EnrichedPatient` DTO. Writes use `$transaction` to split fields across User and Patient tables.

**Rationale**:
- The domain `Patient` type is a flattened read-model DTO (fullName, email, phone, documentId, status, notes), while Prisma stores identity in User (name, email) and clinical/audit data in Patient (phone, documentId, notes, status).
- **Single file** (not split like bookings' `booking-data.ts` + `booking-availability.ts`) because patients have no availability/overlap logic — pure CRUD + 1 status mutation.
- Patients is simpler than bookings: no state machine, no wizard, no cross-module writes, no time-bucketing.

**The `EnrichedPatient` type — flat DTO with audit**:
```typescript
// patient-data.types.ts
import type { Patient } from "../domain/patient.schema";

export interface EnrichedPatient extends Patient {
  createdByUserName: string | null; // from createdByUser relation
}
```

Note: `Patient` already has `fullName`, `email`, `phone`, `documentId`, `status`, `notes`, `createdAt`, `updatedAt` from the domain schema. The data layer maps:
- `user.name` → `fullName`
- `user.email` → `email`
- `createdByUser.name` → `createdByUserName`
- All Patient fields pass through directly

**Shared Prisma `include` — single source of truth**:
```typescript
const PATIENT_INCLUDE = {
  user: { select: { name: true, email: true } },
  createdByUser: { select: { name: true } },
} satisfies Prisma.PatientInclude;
```

**Read mapping (getPatients / getPatientById)**:
```typescript
function mapToEnrichedPatient(
  patient: Prisma.PatientGetPayload<{ include: typeof PATIENT_INCLUDE }>
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
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
    createdByUserId: patient.createdByUserId,
    createdByUserName: patient.createdByUser?.name ?? null,
  };
}
```

**Write strategy (createPatient / updatePatient)**:
- `createPatient`: `$transaction`: create User (name, email, role="PATIENT") → create Patient (userId, createdByUserId, documentId, phone, notes, status).
- `updatePatient`: `$transaction`: update User (name, email) + update Patient (phone, documentId, notes, status).

**Types**:
```typescript
// patient-data.types.ts
export const DEFAULT_PAGE_SIZE = 20;

export interface PatientFilters {
  status?: PatientStatusType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPatients {
  patients: EnrichedPatient[];
  total: number;
  page: number;
  pageSize: number;
}
```

**4 pure functions**:

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPatients` | `(orgId: string, filters?: PatientFilters) => Promise<PaginatedPatients>` | Paginated list. Filter by `status` (exact), `search` (name/email contains via Prisma `mode: "insensitive"`). 1-indexed page. |
| `getPatientById` | `(orgId: string, id: string) => Promise<EnrichedPatient \| null>` | Single patient with `createdByUserName`. Null when missing/wrong org. |
| `createPatient` | `(orgId: string, data: CreatePatientInput, createdByUserId: string) => Promise<EnrichedPatient>` | `$transaction`: create User → create Patient. Caller handles dedup. |
| `updatePatient` | `(orgId: string, id: string, data: UpdatePatientInput) => Promise<EnrichedPatient>` | `$transaction`: update User.name, User.email + Patient fields. Returns updated. |

**`createPatient` data flow inside `$transaction`**:
```typescript
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
    const created = await tx.patient.create({
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

    return created;
  });

  return mapToEnrichedPatient(patient);
}
```

**`updatePatient` data flow inside `$transaction`**:
```typescript
export async function updatePatient(
  organizationId: string,
  id: string,
  data: UpdatePatientInput,
): Promise<EnrichedPatient> {
  const updated = await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: { id, organizationId },
      select: { userId: true },
    });
    if (!patient) {
      throw new PatientNotFoundError();
    }

    // Update User name/email if provided
    if (data.fullName !== undefined || data.email !== undefined) {
      await tx.user.update({
        where: { id: patient.userId },
        data: {
          ...(data.fullName !== undefined ? { name: data.fullName } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
        },
      });
    }

    // Update Patient fields
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

  return mapToEnrichedPatient(updated);
}
```

**Role scoping**:
- Data layer stays **pure** — no auth imports. It receives `createdByUserId` as a plain parameter.
- The **caller** (action) resolves the session and passes the user id.
- For reads, no scoping is needed — all dashboard roles can see all patients in the org.

**Alternatives considered**:
- Separate `patient-queries.ts` + `patient-mutations.ts` — rejected. Patients is pure CRUD; splitting reads and writes adds navigation overhead without domain benefit. The file will be ~200 lines — comfortable.
- Reshape domain to match Prisma (nested user object) — rejected. Would break the existing domain spec, tests, and `patientMatches` dedup logic. The flat DTO approach preserves domain integrity.

---

### AD2: Migration — `add_patient_document_and_audit`

**Decision**: Single migration adds `documentId String?` and `createdByUserId String` to the Patient model.

**Rationale**:
- The proposal and spec require `documentId` to participate in dedup checks. Without a storage column, `patientMatches` dedup-by-documentId silently no-ops.
- `createdByUserId` is required for the audit trail ("Creado por {userName}" on detail page).
- `createdByUserId` is a **plain string column, NOT a Prisma relation**. Rationale: Better Auth's `User` model is at `prisma/schema.prisma:16`, and Patient already has a `userId → User` relation. Adding a second relation `createdByUserId → User` creates a circular reference that Better Auth's prisma-adapter may not handle cleanly. The column is audit-only — display "Desconocido" if the user is deleted, no cascade needed.

**Prisma schema changes**:
```diff
model Patient {
  id             String   @id @default(uuid())
  organizationId String
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
+ documentId     String?
+ createdByUserId String  // plain string, no @relation — audit FK, avoid circular dep
  status         String   @default("ACTIVE")
  phone          String?
  address        String?
  dateOfBirth    DateTime?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  bookings Booking[]

  @@index([organizationId])
  @@index([status])
+ @@index([documentId])
+ @@index([createdByUserId])
}
```

**`createdByUserId`: plain string, no foreign key**:
- No `@relation` field on `createdByUserId`. This is deliberate.
- Better Auth's `User` model already has a `patient Patient?` relation through `userId`. Adding a second relation `createdBy` would create a second back-reference on User, requiring `createdPatients Patient[]` — which Better Auth's prisma-adapter may not expect.
- The column stores a UUID that *references* a User, but Prisma does not enforce the FK constraint. Orphaned references (deleted users) display "Desconocido" in the UI.
- This follows the pattern from the proposal: "audit FK, no cascade semantics needed".

**Migration command**:
```bash
pnpm prisma migrate dev --name add_patient_document_and_audit
```

**SQL generated (approximate)**:
```sql
ALTER TABLE "Patient" ADD COLUMN "documentId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "createdByUserId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Patient_documentId_idx" ON "Patient"("documentId");
CREATE INDEX "Patient_createdByUserId_idx" ON "Patient"("createdByUserId");
```

**Two-step approach for existing rows**:
1. Add `createdByUserId` as nullable first (with a default empty string for existing rows).
2. Backfill: update `Patient SET "createdByUserId" = (SELECT id FROM "user" WHERE role = 'ADMIN' LIMIT 1)` for any rows where `createdByUserId = ''`.
3. Migration already adds the column with a default — Prisma handles this.

**Seed impact**:
- Existing seed creates patients with `userId` linking to User records. `documentId` remains null for existing seed patients.
- `createdByUserId` set to the admin user's ID for existing patients.
- Add 1-2 seed patients with `documentId` populated for testing.

**Rollback**:
1. Drop columns: `ALTER TABLE "Patient" DROP COLUMN "documentId", DROP COLUMN "createdByUserId"`.
2. Revert migration: `pnpm prisma migrate dev --name remove_patient_document_and_audit`.
3. No data loss — columns are additive.

---

### AD3: Dedup Logic

**Decision**: `patientMatches` runs inside the action, NOT the data layer. The action fetches all org patients (with User data), runs the domain dedup function, and aborts with a sentinel error if a match is found.

**Rationale**:
- The data layer is pure — it should not know about the domain's `patientMatches` logic.
- `patientMatches` compares domain DTOs (name+email, name+phone, documentId). The data layer would need to flatten every patient to call it — which means fetching all patients anyway. The action can do this just as easily.
- For MVP orgs with <1000 patients, a full-scan dedup is acceptable. A future optimization can push the dedup check into the database (via a `findFirst` with composite conditions).

**Flow inside `createPatient` action**:
```typescript
// Inside createPatient.action.ts
const result = await prisma.$transaction(async (tx) => {
  // 1. Create the User first
  const user = await tx.user.create({
    data: { name: data.fullName, email: data.email, role: "PATIENT" },
  });

  // 2. Fetch all org patients (flattened) for dedup
  const existingPatients = await tx.patient.findMany({
    where: { organizationId },
    include: { user: { select: { name: true, email: true } } },
  });

  const existingDTOs = existingPatients.map(p => ({
    id: p.id,
    fullName: p.user.name,
    email: p.user.email,
    phone: p.phone ?? undefined,
    documentId: p.documentId ?? undefined,
  })) as PatientData[];

  const inputDTO: PatientData = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    documentId: data.documentId,
    status: data.status,
    notes: data.notes,
  };

  // 3. Domain dedup check
  for (const existing of existingDTOs) {
    if (patientMatches(existing, inputDTO)) {
      throw new DedupError("Ya existe un paciente con los mismos datos");
    }
  }

  // 4. Create Patient
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

// Action catches DedupError → returns { success: false, error: "Ya existe un paciente con los mismos datos" }
```

**Why inside `$transaction`**:
- The dedup check and the Patient insert are in the same atomic transaction.
- If two concurrent requests create the same patient, the second one will see the first's insert and dedup correctly (because the SELECT runs after the User INSERT but before the Patient INSERT, all within one snapshot).
- Email uniqueness is a separate guard: Prisma P2002 on `User.email @unique` catches duplicate emails. The action catches P2002 and returns "Ya existe un paciente con ese email".

**Performance note**:
- For MVP orgs with <1000 patients, `findMany` + in-memory `patientMatches` loop is fast enough (<10ms for 1000 records).
- A future optimization can push `documentId` dedup to the DB via a unique index or `findFirst({ where: { documentId, organizationId } })`.
- For now, the single `$transaction` with full-scan is correct and simple.

**Alternatives considered**:
- Dedup in the data layer — rejected because the data layer should not import domain logic. The action owns orchestration.
- Dedup via separate DB query (not in transaction) — rejected because of the race condition risk. Transaction guarantees snapshot isolation.

---

### AD4: RBAC Enforcement

**Decision**: Three-layer enforcement — layout (PATIENT redirect, already exists), actions (role check), data layer (no auth — receives `createdByUserId` as param). Matching the bookings RBAC pattern exactly.

**Layer 1 — Layout (already exists in `(dashboard)/layout.tsx`)**:
```typescript
// PATIENT users are redirected to /
if (user.role === USER_ROLE.PATIENT) {
  redirect("/");
}
```
This ensures only ADMIN, SECRETARY, and PROFESSIONAL can access `/dashboard/*` routes including patients. Zero changes needed.

**Layer 2 — Server Actions (per-action RBAC check)**:
```typescript
// In every patient action:
const session = await auth.api.getSession({ headers: await headers() });
const role = session.user.role;

// PATIENT role cannot create/edit patients
if (role === USER_ROLE.PATIENT) {
  return { success: false, error: "No autorizado" };
}

// All other roles (ADMIN, SECRETARY, PROFESSIONAL) can create/edit.
// Note: unlike bookings, there is no PROFESSIONAL scoping for patients —
// all staff roles have full access to the patient directory.
```

**Layer 3 — Data Layer (no auth)**:
- `createPatient(data, createdByUserId)` — caller passes the creating user's ID.
- `getPatients(orgId, filters)` — no RBAC scoping needed. All dashboard roles see all patients in the org.
- `getPatientById(orgId, id)` — cross-org protection via WHERE clause. Null means not-found.

**Permission matrix for patients**:

| Action | ADMIN | SECRETARY | PROFESSIONAL | PATIENT |
|--------|-------|-----------|--------------|---------|
| View list | ✅ All | ✅ All | ✅ All | ❌ Layout redirect |
| View detail | ✅ Any | ✅ Any | ✅ Any | ❌ Layout redirect |
| Create patient | ✅ | ✅ | ✅ | ❌ Action rejects |
| Update patient | ✅ | ✅ | ✅ | ❌ Action rejects |
| Change status | ✅ | ✅ | ✅ | ❌ Action rejects |

**Why no PROFESSIONAL scoping for patients**:
- Unlike bookings (where a professional can only see their own), patients are a shared org resource. Any staff member should be able to look up any patient.
- If future requirements demand "PROFESSIONAL sees only their own patients", add a `professionalUserId` filter to `PatientFilters` (same pattern as `BookingFilters.professionalUserId`).

**Alternatives considered**:
- RBAC only at the data layer — rejected because the data layer is pure; auth imports would violate the established pattern.
- `proxy.ts` RBAC — rejected because the auth module already handles this in the layout. Action-level checks are defense-in-depth.

---

### AD5: Bookings Data Layer Extension

**Decision**: Add optional `patientId?: string` to `BookingFilters` and `WHERE patientId: patientId` to `getBookings`. Backwards-compatible — zero changes to existing callers.

**Rationale**:
- The detail page needs to show booking history for a patient. Today, `getBookings` cannot filter by patient.
- `patientId` already exists in the Booking model (was made nullable in the bookings migration). No new migration needed.
- Adding the filter is a 3-line change — trivial and low-risk.

**Changes to `booking-data.types.ts`**:
```diff
export interface BookingFilters {
  dateRange?: { start: Date; end: Date };
  professionalId?: string;
  serviceId?: string;
  status?: BookingStatusType[];
  search?: string;
  professionalUserId?: string;
+ patientId?: string;
  page?: number;
  pageSize?: number;
}
```

**Changes to `booking-data.ts` — WHERE clause**:
```diff
// In getBookings(), after professionalUserId:
if (professionalUserId) {
  where.professional = { userId: professionalUserId };
}
+ if (patientId) {
+   where.patientId = patientId;
+ }
```

**Backwards compatibility**:
- `patientId` defaults to `undefined`.
- `if (patientId)` is falsy when undefined → WHERE clause is not added.
- Existing callers (`BookingsTableData`, `BookingDetailPage`) pass no `patientId` → behavior unchanged.
- New caller (`PatientDetailPage`) passes `{ patientId: params.id }` → returns only that patient's bookings.

**No migration needed** — `patientId` column exists since the bookings migration made it nullable.

**Alternatives considered**:
- Separate `getBookingsByPatient(orgId, patientId)` function — rejected. Pollutes the data layer with a thin wrapper when a simple filter extension achieves the same result.
- Using Prisma's `booking.findMany({ where: { patient: { id: patientId } } })` — this works but is inconsistent with the direct `patientId` pattern in the Booking model. Using `where.patientId` is simpler.

---

### AD6: Component Tree — Server/Client Boundary

**Decision**: List and Detail pages are Server Components with async data-fetching wrappers. Edit page is fully Client (form with interactivity).

**List page: `PatientsPage` (Server Component)**:
```
PatientsPage (Server, async)
│  → getOrganizationId()
│  → searchParams: search, status, page
│
├── <PageHeader /> — "Pacientes" title + "Nuevo Paciente" button
│
├── <PatientSearchBar /> (Client)
│   → text input, on submit → updates URL ?search=
│
├── <PatientStatusFilter /> (Client)
│   → Select: Todos / Activo / Inactivo / Bloqueado
│   → updates URL ?status=
│
├── <Suspense fallback={<PatientTableSkeleton rows={5} />}>
│   └── <PatientTableDataWrapper organizationId={orgId} filters={...} />
│       (async Server Component that calls getPatients())
│       │
│       └── <PatientTable patients={paginated.patients} /> (Client)
│           ├── <thead> — Nombre, Email, Teléfono, DNI, Estado, Creado por
│           └── <tbody>
│               └── <PatientRow> × N
│                   ├── <PatientStatusBadge status={p.status} />
│                   └── Link → /dashboard/patients/[id]
│
└── <PatientEmptyState /> (Client) — "No hay pacientes"
    → rendered conditionally when paginated.total === 0
```

**Why `PatientTableDataWrapper`?** Following the dashboard page and bookings page patterns. Suspense needs an async child to catch the loading state. The wrapper is thin:
```tsx
// PatientTableDataWrapper
async function PatientTableDataWrapper({ organizationId, filters }: Props) {
  const result = await getPatients(organizationId, filters);
  return <PatientTable patients={result.patients} />;
}
```

**Detail page: `PatientDetailPage` (Server Component)**:
```
PatientDetailPage (Server, async)
│  → params.id → getPatientById(orgId, id)
│  → 404 if null
│  → getBookings(orgId, { patientId: id })
│
└── <PatientDetail patient={enriched} bookings={paginatedBookings} /> (Client)
    ├── <PageHeader /> — back button + patient name + status badge
    ├── <InfoCards>
    │   ├── InfoPersonal — fullName, email, phone, documentId
    │   ├── InfoAudit — "Creado por {createdByUserName}" + createdAt
    │   └── InfoNotes — notes (collapsible if long)
    ├── <StatusChangeDropdown /> (Client)
    │   → Select with ACTIVE / INACTIVE / BLOCKED
    │   → on change: calls changePatientStatus(id, newStatus)
    │   → on success: refresh page
    │   → on error: toast
    ├── <BookingHistorySection>
    │   └── <BookingHistoryTable bookings={bookings.bookings} /> (Client)
    │       → reuses bookings table columns (Fecha, Servicio, Estado)
    │       → each row links to /dashboard/bookings/[id]
    │       → empty state: "Sin turnos registrados"
    └── <ActionBar>
        └── "Editar" button → /dashboard/patients/[id]/edit
```

**Edit page: `PatientEditPage` (Client Component)**:
```
PatientEditPage ("use client")
│  → receives patient as prop from Server Component parent
│
└── <PatientForm patient={patient} /> (Client)
    ├── Fields: fullName (input), email (input), phone (input),
    │   documentId (input), notes (textarea)
    ├── Client-side Zod 4 validation matching patientDataSchema
    │   → Spanish error messages
    │   → real-time validation on blur
    ├── on submit: calls updatePatient(id, formData)
    │   → Zod safeParse on formData
    │   → Server Action call
    │   → success → router.push(`/dashboard/patients/${id}`)
    │   → error → set form error state
    ├── "Guardar cambios" submit button
    └── "Cancelar" link → /dashboard/patients/[id]
```

**Why edit page needs a Server Component wrapper**:
The edit page needs `getPatientById(id)` to pre-fill the form. This is a Server Component concern. The pattern:

```
PatientEditPage (Server, async)
│  → params.id → getPatientById(orgId, id) → 404 if null
│
└── <PatientEditForm patient={enriched} /> (Client)
    → Client Component with form state, Zod validation, useActionState
```

**Server/Client boundary rules**:
- Server Components: fetch data, pass as serializable props to Client Components.
- Client Components: receive data as props, handle interactivity (search, filters, form, dropdown).
- The edit form is the only fully Client route page (because it needs form state, validation, submission handlers).

---

### AD7: File Structure

**Decision**: Module-organized by layer following the bookings pattern exactly. Components split between `src/components/patients/` (presentational) and `src/modules/patients/` (logic).

```
src/modules/patients/
├── domain/                               # EXISTS — MODIFIED
│   ├── patient.ts                        # MODIFIED: add createdByUserId field
│   ├── patient.schema.ts                 # MODIFIED: add createdByUserId to patientSchema
│   ├── __tests__/
│   │   └── patient.test.ts              # MODIFIED: test createdByUserId validation
│   └── index.ts                          # UNCHANGED
│
├── data/                                 # NEW — pure data access
│   ├── patient-data.ts                   # getPatients, getPatientById,
│   │                                     #   createPatient, updatePatient
│   ├── patient-data.types.ts             # EnrichedPatient, PatientFilters,
│   │                                     #   PaginatedPatients, DEFAULT_PAGE_SIZE
│   └── __tests__/
│       └── patient-data.test.ts          # Vitest tests with mocked prisma
│
├── actions/                              # NEW — Server Actions
│   ├── create-patient.action.ts          # createPatient
│   ├── update-patient.action.ts          # updatePatient
│   ├── change-patient-status.action.ts   # changePatientStatus
│   ├── patient-actions.schema.ts         # Zod 4: createPatientSchema,
│   │                                     #   updatePatientSchema, changeStatusSchema
│   ├── patient-actions.types.ts          # PatientResult<T>, inferred input types
│   ├── __tests__/
│   │   ├── create-patient.test.ts
│   │   ├── update-patient.test.ts
│   │   └── change-patient-status.test.ts
│   └── index.ts                          # barrel
│
├── presentation/                         # NEW — es-AR formatters
│   ├── formatters.ts                     # getPatientStatusLabel, formatPatientName
│   └── index.ts                          # barrel
│
└── index.ts                              # MODIFIED — export all layers
    export * from "./domain";
    export * from "./data/patient-data";
    export * from "./data/patient-data.types";
    export * from "./actions";
    export * from "./presentation";

src/components/patients/                  # NEW — presentational components
├── patient-table.tsx                     # Client: DataTable with columns
├── patient-status-badge.tsx              # Client: Activo (green), Inactivo (gray), Bloqueado (red)
├── patient-detail.tsx                    # Client: detail info cards + booking history
├── patient-form.tsx                      # Client: edit form with Zod 4 + useActionState
└── __tests__/
    ├── patient-status-badge.test.tsx
    └── patient-form.test.tsx

src/app/(dashboard)/dashboard/patients/   # NEW — route pages
├── page.tsx                              # Server: list page
├── [id]/
│   ├── page.tsx                          # Server: detail page
│   └── edit/
│       └── page.tsx                      # Server wrapper + Client form

prisma/
├── schema.prisma                         # MODIFIED: add documentId + createdByUserId
└── migrations/
    └── add_patient_document_and_audit/   # NEW migration
```

**Why 3 actions (not 1 per mutation type)**:
Unlike bookings (6 actions — 6 state transitions), patients has exactly 3 mutations:
1. Create (with dedup + User creation)
2. Update (with User+Patient split)
3. Status change (simple field update)

Each is an independent `"use server"` boundary with its own Zod schema and RBAC check. File-per-action keeps git blame clean and test isolation simple.

**Why `patient-data.ts` is a single file (not split)**:
Bookings splits `booking-data.ts` (queries) from `booking-availability.ts` (business rules) because availability is a separate domain concern with different consumers. Patients has no such split — it's pure CRUD. A single file keeps navigation simple.

---

### AD8: Status Change Pattern

**Decision**: 3 statuses (ACTIVE, INACTIVE, BLOCKED). No state machine — any transition is valid. Simple `prisma.patient.update({ where: { id }, data: { status } })`.

**Rationale**:
- Unlike bookings (which has 7 statuses with `canTransition` enforcing PENDING→CONFIRMED→COMPLETED), patient status is purely informational — a label, not a workflow.
- Any status can change to any other at any time. No business rules restrict transitions.
- This is a 1-line Prisma call wrapped in an action with Zod validation + RBAC + revalidation.

**`changePatientStatus` action flow**:
```typescript
"use server";

export async function changePatientStatus(
  input: ChangeStatusInput
): Promise<PatientResult> {
  // 1. Zod validate { id: z.uuid(), status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]) }
  // 2. Auth: getSession + getOrganizationId
  // 3. RBAC: reject PATIENT role
  // 4. Verify patient exists in org → not found → return error
  // 5. prisma.patient.update({ where: { id }, data: { status: parsed.status } })
  // 6. revalidatePath("/dashboard/patients")
  // 7. return { success: true }
}
```

**Wired through dropdown on detail page**:
```tsx
// PatientDetail (Client Component)
<Select onValueChange={async (newStatus) => {
  const result = await changePatientStatus({ id: patient.id, status: newStatus });
  if (result.success) {
    router.refresh();
  } else {
    toast.error(result.error);
  }
}}>
  <SelectTrigger>Cambiar estado</SelectTrigger>
  <SelectContent>
    <SelectItem value="ACTIVE">Activo</SelectItem>
    <SelectItem value="INACTIVE">Inactivo</SelectItem>
    <SelectItem value="BLOCKED">Bloqueado</SelectItem>
  </SelectContent>
</Select>
```

**No optimistic locking** — patient status changes are rare and low-contention. Unlike bookings (where two staff members might try to confirm the same booking simultaneously), patient status changes don't race.

**Alternatives considered**:
- State machine with `canTransitionPatient(from, to)` — rejected. Over-engineering for a 3-value label. If future requirements add transition rules (e.g., "BLOCKED → ACTIVE requires admin approval"), add the state machine then.

---

## Component Tree

### List Page (`/dashboard/patients`)

```
PatientsPage (Server, async)
├── PageHeader
│   ├── <h1>Pacientes</h1>
│   └── <Button asChild><Link href="/dashboard/patients/new">Nuevo Paciente</Link></Button>
├── <div className="flex gap-4">
│   ├── PatientSearchBar — input with placeholder "Buscar por nombre o email"
│   │   → onChange debounce → router.push with ?search=
│   └── PatientStatusFilter — Select: Todos / Activo / Inactivo / Bloqueado
│       → onChange → router.push with ?status=
├── Suspense fallback={<PatientTableSkeleton rows={5} />}
│   └── PatientTableDataWrapper (async)
│       └── PatientTable
│           ├── <thead>
│           │   └── <tr>
│           │       ├── Nombre
│           │       ├── Email
│           │       ├── Teléfono
│           │       ├── DNI
│           │       ├── Estado
│           │       └── Creado por
│           └── <tbody>
│               └── PatientRow × N
│                   ├── <td>{fullName}</td>
│                   ├── <td>{email || "—"}</td>
│                   ├── <td>{phone || "—"}</td>
│                   ├── <td>{documentId || "—"}</td>
│                   ├── <td><PatientStatusBadge status={status} /></td>
│                   ├── <td>{createdByUserName || "—"}</td>
│                   └── <td><Link href={`/dashboard/patients/${id}`}><Button variant="ghost" size="icon-sm">→</Button></Link></td>
└── PatientEmptyState — when total === 0
    └── "No hay pacientes" + icon
```

### Detail Page (`/dashboard/patients/[id]`)

```
PatientDetailPage (Server, async)
└── PatientDetail (Client)
    ├── Header
    │   ├── Back button → /dashboard/patients
    │   ├── <h1>{fullName}</h1>
    │   └── PatientStatusBadge
    ├── Info Grid (2 columns on desktop, 1 on mobile)
    │   ├── InfoCard "Información Personal"
    │   │   ├── Nombre: {fullName}
    │   │   ├── Email: {email || "—"}
    │   │   ├── Teléfono: {phone || "—"}
    │   │   └── DNI: {documentId || "—"}
    │   ├── InfoCard "Auditoría"
    │   │   ├── Estado: <PatientStatusBadge />
    │   │   ├── Creado por: {createdByUserName || "—"}
    │   │   └── Fecha de creación: {formatDate(createdAt)}
    │   ├── InfoCard "Notas" (only if notes exist)
    │   │   └── {notes}
    │   └── InfoCard "Estado"
    │       ├── Current status badge
    │       └── StatusChangeDropdown
    ├── BookingHistorySection
    │   ├── <h2>Historial de turnos</h2>
    │   ├── BookingHistoryTable
    │   │   ├── Columns: Fecha, Hora, Servicio, Estado
    │   │   ├── Each row → Link to /dashboard/bookings/[id]
    │   │   └── Empty: "Sin turnos registrados"
    │   └── Pagination if > 20 bookings
    └── ActionBar
        └── "Editar paciente" button → /dashboard/patients/[id]/edit
```

### Edit Page (`/dashboard/patients/[id]/edit`)

```
PatientEditPage (Server, async)
│  → getPatientById(orgId, id) → 404 if null
│
└── PatientEditForm (Client)
    ├── <Card>
    │   ├── <CardHeader>
    │   │   ├── <CardTitle>Editar paciente</CardTitle>
    │   │   └── <CardDescription>{fullName}</CardDescription>
    │   └── <CardContent>
    │       └── <form action={action}>
    │           ├── fullName — <Input label="Nombre completo" required />
    │           ├── email — <Input label="Email" type="email" />
    │           ├── phone — <Input label="Teléfono" />
    │           ├── documentId — <Input label="DNI" placeholder="Sin puntos ni guiones" />
    │           └── notes — <Textarea label="Notas" maxLength={1000} />
    ├── <CardFooter>
    │   ├── <Button type="submit" disabled={isPending}>
    │   │   {isPending ? "Guardando..." : "Guardar cambios"}
    │   │   </Button>
    │   └── <Button variant="ghost" asChild>
    │       └── <Link href={`/dashboard/patients/${id}`}>Cancelar</Link>
    │       </Button>
    └── {state?.errors && <FormErrors errors={state.errors} />}
```

---

## Data Flow

### Flow 1: List Patients

```
1. User navigates to /dashboard/patients
2. DashboardLayout renders (RBAC gate — PATIENT redirected)
3. PatientsPage (Server Component):
   a. getOrganizationId() → organizationId
   b. Extract searchParams: search, status, page (default 1)
   c. Construct PatientFilters
4. PatientTableDataWrapper (async Server Component in Suspense):
   a. getPatients(organizationId, filters) → PaginatedPatients
   b. Render <PatientTable patients={data.patients} />
5. PatientTable (Client Component):
   a. Renders rows with PatientStatusBadge
   b. Each row has a link → /dashboard/patients/[id]
6. Filter change → URL searchParams update → router.push → PatientsPage re-fetches
```

### Flow 2: Create Patient

```
1. User clicks "Nuevo Paciente" (future route) or uses a modal/dialog
2. Form calls createPatient Server Action:
   a. Zod 4 validation → safeParse(input)
   b. auth.api.getSession() → role check
   c. if role === PATIENT → return { success: false, error: "No autorizado" }
   d. getOrganizationId() → organizationId
   e. $transaction:
      - Create User (name, email, role="PATIENT")
      - Fetch all org patients with User data (for dedup)
      - Run patientMatches against input
      - If match → throw DedupError
      - Create Patient (userId, createdByUserId, documentId, phone, notes, status)
   f. Catch DedupError → return { success: false, error: "Ya existe un paciente con los mismos datos" }
   g. Catch P2002 → return { success: false, error: "Ya existe un paciente con ese email" }
   h. revalidatePath("/dashboard/patients")
   i. Return { success: true, data: { id: created.id } }
3. On success: redirect to /dashboard/patients/[id]
4. On error: show error message, keep form state
```

### Flow 3: Update Patient (from Edit Page)

```
1. User modifies form fields, submits
2. Client-side Zod 4 validation via safeParse(formData)
   a. If invalid → show inline errors, don't submit
   b. If valid → call updatePatient Server Action
3. Server Action:
   a. Zod validate input (defense-in-depth)
   b. auth.api.getSession() → role check
   c. if role === PATIENT → return { success: false, error: "No autorizado" }
   d. getOrganizationId()
   e. Verify patient exists in org → not found → return { success: false, error: "Paciente no encontrado" }
   f. $transaction:
      - Update User (name, email) if changed
      - Update Patient (phone, documentId, notes, status) if changed
   g. Catch P2025 → return { success: false, error: "Paciente no encontrado" }
   h. Catch P2002 (email duplicate on User.update) → return { success: false, error: "Ya existe un paciente con ese email" }
   i. revalidatePath("/dashboard/patients")
   j. Return { success: true }
4. On success: router.push(`/dashboard/patients/${id}`)
5. On error: display inline error message
```

### Flow 4: Change Patient Status (from Detail Page)

```
1. User selects new status from dropdown on detail page
2. Client calls changePatientStatus({ id, status }):
   a. Zod validation → safeParse
   b. auth.api.getSession() → role check
   c. if role === PATIENT → return { success: false, error: "No autorizado" }
   d. getOrganizationId()
   e. Verify patient exists in org → not found → return { success: false, error: "Paciente no encontrado" }
   f. prisma.patient.update({ where: { id }, data: { status } }) — no state machine
   g. revalidatePath("/dashboard/patients")
   h. Return { success: true }
3. On success: router.refresh() → detail page shows new status
4. On error: toast error message
```

### Flow 5: Dedup Check (Atomic, inside Create)

```
createPatient() action:
1. prisma.$transaction(async (tx) => {
     // Step 1: Create User
     const user = await tx.user.create({ data: { name, email, role: "PATIENT" } });

     // Step 2: Fetch existing patients in the org
     const existing = await tx.patient.findMany({
       where: { organizationId },
       include: { user: { select: { name: true, email: true } } },
     });

     // Step 3: Dedup check (in-memory, domain function)
     for (const p of existing) {
       if (patientMatches({
         fullName: p.user.name,
         email: p.user.email,
         phone: p.phone ?? undefined,
         documentId: p.documentId ?? undefined,
       }, input)) {
         throw new DedupError("Ya existe un paciente con los mismos datos");
       }
     }

     // Step 4: Create Patient (no match found)
     return tx.patient.create({ data: { ...patientData, userId: user.id } });
   })
2. The $transaction ensures atomicity: another concurrent create
   will see this transaction's User insertion and the SELECT in step 2
   will catch the duplicate.
3. Email uniqueness (User.email @unique) is caught as P2002 by the
   outer catch block — this is a separate guard.
```

---

## Route Design

| Route | Page | Type | Props |
|-------|------|------|-------|
| `/dashboard/patients` | `page.tsx` | Server Component | `searchParams`: search, status, page |
| `/dashboard/patients/[id]` | `[id]/page.tsx` | Server Component | `params.id` |
| `/dashboard/patients/[id]/edit` | `[id]/edit/page.tsx` | Server Component (wrapper) + Client (form) | `params.id` |

**URL search params for list page filters**:
- `?search=juan` — text search across patient name/email
- `?status=BLOCKED` — filter by exact status
- `?page=2` — pagination (1-indexed, default 20 per page)

**Route behavior**:
- List page: `searchParams` drive filters. Changes push to URL → Server Component re-renders.
- Detail page: `params.id` → `getPatientById` → null → `notFound()` (404 for wrong org or nonexistent).
- Edit page: `params.id` → `getPatientById` → null → `notFound()`. PATIENT role blocked at layout (redirect to `/`).

---

## File Manifest

### Files to Create

| File | Purpose | Phase |
|------|---------|-------|
| `src/modules/patients/data/patient-data.ts` | 4 pure functions: getPatients, getPatientById, createPatient, updatePatient | PR #1 — Data Layer |
| `src/modules/patients/data/patient-data.types.ts` | EnrichedPatient, PatientFilters, PaginatedPatients, DEFAULT_PAGE_SIZE | PR #1 |
| `src/modules/patients/data/__tests__/patient-data.test.ts` | Vitest tests with mocked prisma | PR #1 |
| `src/modules/patients/actions/patient-actions.schema.ts` | Zod 4 schemas: createPatientSchema, updatePatientSchema, changeStatusSchema | PR #2 — Actions |
| `src/modules/patients/actions/patient-actions.types.ts` | PatientResult<T>, CreatePatientInput, UpdatePatientInput, ChangeStatusInput | PR #2 |
| `src/modules/patients/actions/create-patient.action.ts` | Server Action with dedup + P2002 handling | PR #2 |
| `src/modules/patients/actions/update-patient.action.ts` | Server Action with P2025 handling | PR #2 |
| `src/modules/patients/actions/change-patient-status.action.ts` | Server Action — simple status update | PR #2 |
| `src/modules/patients/actions/index.ts` | Barrel — export all actions + types | PR #2 |
| `src/modules/patients/actions/__tests__/create-patient.test.ts` | Vitest test | PR #2 |
| `src/modules/patients/actions/__tests__/update-patient.test.ts` | Vitest test | PR #2 |
| `src/modules/patients/actions/__tests__/change-patient-status.test.ts` | Vitest test | PR #2 |
| `src/modules/patients/presentation/formatters.ts` | getPatientStatusLabel, formatPatientName (es-AR) | PR #3 — List + Detail |
| `src/modules/patients/presentation/index.ts` | Barrel | PR #3 |
| `src/components/patients/patient-table.tsx` | DataTable with columns: Nombre, Email, Teléfono, DNI, Estado, Creado por | PR #3 |
| `src/components/patients/patient-status-badge.tsx` | Activo (green), Inactivo (gray), Bloqueado (red) | PR #3 |
| `src/components/patients/patient-detail.tsx` | Detail view: info cards, audit, booking history, status dropdown | PR #3 |
| `src/components/patients/patient-form.tsx` | Edit form with Zod 4 client-side validation + useActionState | PR #3 |
| `src/components/patients/__tests__/patient-status-badge.test.tsx` | Renders correct label and color per status | PR #3 |
| `src/components/patients/__tests__/patient-form.test.tsx` | Client-side validation errors | PR #3 |
| `src/app/(dashboard)/dashboard/patients/page.tsx` | List page — Server Component with Suspense | PR #3 |
| `src/app/(dashboard)/dashboard/patients/[id]/page.tsx` | Detail page — Server Component | PR #3 |
| `src/app/(dashboard)/dashboard/patients/[id]/edit/page.tsx` | Edit page — Server wrapper + Client form | PR #3 |

### Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `prisma/schema.prisma` | Add `documentId String?` + `createdByUserId String` to Patient model | PR #1 |
| `src/modules/patients/domain/patient.schema.ts` | Add `createdByUserId: z.uuid()` to `patientSchema`. `patientDataSchema` unchanged (strict). | PR #1 |
| `src/modules/patients/domain/patient.ts` | Add `createdByUserId` to exported types (auto-inferred from schema) | PR #1 |
| `src/modules/patients/domain/__tests__/patient.test.ts` | Test `createdByUserId` validation in `patientSchema`; test `patientDataSchema` rejects it | PR #1 |
| `src/modules/patients/index.ts` | Add exports for data, actions, presentation layers | PR #1 (additive across PRs) |
| `src/modules/bookings/data/booking-data.types.ts` | Add `patientId?: string` to `BookingFilters` | PR #3 |
| `src/modules/bookings/data/booking-data.ts` | Add `if (patientId) where.patientId = patientId` in `getBookings` | PR #3 |

### Files NOT Modified

| File | Reason |
|------|--------|
| `src/app/(dashboard)/layout.tsx` | PATIENT redirect already exists — no change needed |
| `src/modules/auth/*` | No changes needed for patients module |
| `src/modules/dashboard/*` | Already exports `getOrganizationId()` — reused as-is |
| `src/components/dashboard/sidebar.tsx` | Patients link already exists at line 98 |
| `src/modules/bookings/actions/*` | Bookings server actions unchanged |
| `prisma/seed.ts` | Seed already creates patients — `createdByUserId` added by migration default |

---

## Migration

### Prisma Migration: `add_patient_document_and_audit`

**Schema changes:**
```diff
model Patient {
  id             String   @id @default(uuid())
  organizationId String
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
+ documentId     String?
+ createdByUserId String
  status         String   @default("ACTIVE")
  phone          String?
  address        String?
  dateOfBirth    DateTime?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  bookings Booking[]

  @@index([organizationId])
  @@index([status])
+ @@index([documentId])
+ @@index([createdByUserId])
}
```

**Key decision — `createdByUserId` as plain String, NOT a relation**:
- No `createdByUser User @relation(...)` — avoids creating a second User relation on Patient.
- Better Auth's `User` model already has `patient Patient?` (1:1 through `userId`). Adding `createdPatients Patient[]` would interfere with Better Auth's prisma-adapter expectations.
- The column stores a UUID reference. If the referenced User is deleted, the UI shows "Desconocido" as a fallback.
- Documented in code comments on the Prisma model.

**SQL generated (approximate):**
```sql
ALTER TABLE "Patient" ADD COLUMN "documentId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "createdByUserId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Patient_documentId_idx" ON "Patient"("documentId");
CREATE INDEX "Patient_createdByUserId_idx" ON "Patient"("createdByUserId");
```

**Steps:**
1. Modify `prisma/schema.prisma` — add `documentId` and `createdByUserId` to Patient model.
2. Run `pnpm prisma migrate dev --name add_patient_document_and_audit`.
3. Modify `patient.schema.ts` — add `createdByUserId: z.uuid({ error: "Invalid UUID" })` to `patientSchema`. `patientDataSchema` stays strict (rejects unknown fields).
4. Update domain tests to cover `createdByUserId` validation.
5. Regenerate Prisma client: `pnpm prisma generate`.
6. Run `pnpm test` — verify domain tests still pass with new schema field.
7. Run `pnpm db:seed` — verify seed works with new columns.

**Backfill for existing rows**:
- Migration sets `createdByUserId` default to empty string for existing rows.
- For development, run seed after migration — seed creates new patients with proper `createdByUserId`.
- For production, a data migration script would update `createdByUserId` to the org admin's user ID.

**Rollback:**
1. Drop columns: `ALTER TABLE "Patient" DROP COLUMN "documentId" CASCADE, DROP COLUMN "createdByUserId" CASCADE`.
2. Revert domain schema changes.
3. `pnpm prisma migrate dev --name remove_patient_document_and_audit`.

---

## Phasing (Chained PRs)

| PR | Scope | Key files | Est. lines |
|----|-------|-----------|------------|
| **#1: Data Layer + Migration + Domain** | Migration, `patient-data.ts`, types, domain schema update, barrel, tests | 8 files | ~350 |
| **#2: Server Actions** | 3 action files + shared schemas + types + barrel + all tests | 9 files | ~380 |
| **#3: Pages + Components** | List page, detail page, edit page, 4 components, 2 tests, formatters, bookings extension | 13 files | ~450 |

**Total:** ~1180 lines across 3 chained PRs. Each within or near the 400-line review budget.

**PR #1 — Data Layer + Migration + Domain** (~350 lines):
- Migration: `prisma/schema.prisma` (+2 fields, +2 indexes)
- Domain: `patient.schema.ts` (+1 field on patientSchema), `patient.test.ts` (test createdByUserId validation)
- Data layer: `patient-data.ts` (4 functions, ~180 lines), `patient-data.types.ts` (4 interfaces, ~50 lines)
- Tests: `patient-data.test.ts` (mocked prisma, ~120 lines)
- Barrel: `src/modules/patients/index.ts` (+4 exports)

**PR #2 — Server Actions** (~380 lines):
- Schemas: `patient-actions.schema.ts` (3 Zod 4 schemas, ~60 lines)
- Types: `patient-actions.types.ts` (PatientResult<T>, 3 input types, ~50 lines)
- Actions: `create-patient.action.ts` (~80 lines), `update-patient.action.ts` (~60 lines), `change-patient-status.action.ts` (~40 lines)
- Tests: 3 test files, ~90 lines each
- Barrel: `actions/index.ts` (~15 lines)

**PR #3 — Pages + Components + Bookings Extension** (~450 lines):
- Presentational: `formatters.ts` (~30 lines), `patient-status-badge.tsx` (~30 lines), `patient-table.tsx` (~80 lines), `patient-detail.tsx` (~120 lines), `patient-form.tsx` (~100 lines)
- Pages: `patients/page.tsx` (~40 lines), `patients/[id]/page.tsx` (~50 lines), `patients/[id]/edit/page.tsx` (~30 lines)
- Bookings: `booking-data.types.ts` (+1 line), `booking-data.ts` (+3 lines)
- Tests: `patient-status-badge.test.tsx` (~20 lines), `patient-form.test.tsx` (~30 lines)

---

## Testing Strategy

### Data Layer Tests (Vitest, PR #1)

- **Mock Prisma client** using `vi.mock("@/lib/prisma")`.
- Test `getPatients`:
  - Pagination: returns correct page, total, pageSize.
  - Status filter: only returns patients with matching status.
  - Search filter: matches by name/email (case-insensitive).
  - Empty result: returns empty array, total=0.
  - Wrong org: returns empty (scoped by organizationId).
  - Page beyond range: returns empty array, total correct.
- Test `getPatientById`:
  - Returns `EnrichedPatient` with `createdByUserName` on match.
  - Returns `null` for missing ID.
  - Returns `null` for wrong org (cross-tenant protection).
- Test `createPatient`:
  - Creates User first, then Patient, in `$transaction`.
  - Maps `user.name → fullName`, `user.email → email`, `createdByUserId` persisted.
  - Returns `EnrichedPatient` with correct `createdByUserName`.
- Test `updatePatient`:
  - Updates both User (name, email) and Patient (phone, documentId, notes).
  - Returns updated `EnrichedPatient`.
  - Throws `PatientNotFoundError` when patient not in org.

### Server Action Tests (Vitest, PR #2)

- **Mock Prisma + auth + headers**.
- Test `createPatient`:
  - Success: valid input, no dedup match → returns `{ success: true, data: { id } }`.
  - Dedup match: existing patient with same name+email → returns "Ya existe un paciente con los mismos datos".
  - Dedup match: same documentId → returns dedup error.
  - Invalid input: missing fullName → returns Zod error.
  - RBAC: PATIENT role → returns "No autorizado".
  - Email duplicate: P2002 → returns "Ya existe un paciente con ese email".
  - No session → returns "No autenticado".
- Test `updatePatient`:
  - Success: valid changes → returns `{ success: true }`.
  - Not found: nonexistent patientId → returns "Paciente no encontrado".
  - Wrong org: patient in different org → returns "Paciente no encontrado".
  - Invalid UUID id → Zod error.
  - Email duplicate: P2002 → returns "Ya existe un paciente con ese email".
  - RBAC: PATIENT role → returns "No autorizado".
- Test `changePatientStatus`:
  - Success: ACTIVE → BLOCKED → returns `{ success: true }`.
  - Invalid status: "PENDING" → Zod error.
  - Not found → returns "Paciente no encontrado".
  - RBAC: PATIENT role → returns "No autorizado".

### Presentational Component Tests (Vitest + Testing Library, PR #3)

- Test `PatientStatusBadge`:
  - ACTIVE → green badge, text "Activo".
  - INACTIVE → gray badge, text "Inactivo".
  - BLOCKED → red badge, text "Bloqueado".
- Test `PatientForm`:
  - Pre-fills with existing patient data.
  - Shows error for empty fullName.
  - Shows error for invalid email format.
  - Shows error for invalid documentId format (letters).
  - Shows error for notes exceeding 1000 characters.
  - Submits valid form data.

---

## Key Learnings from Codebase Exploration

1. **Dashboard + bookings patterns are the template**: `dashboard-data.ts` and `booking-data.ts` prove the pattern — pure async functions, `organizationId` first, no framework imports. Patients follows this exactly and becomes the third module to adopt it.

2. **Auth actions pattern for Server Actions**: `login.action.ts` and `confirm-booking.action.ts` show `"use server"` + Zod `safeParse` + discriminated union return type. Patients follows with `PatientResult<T>`.

3. **Suspense boundaries need thin async wrappers**: The dashboard and bookings pages use `DataWrapper` components because Suspense only works on components that read dynamic data. The patients list page adopts `PatientTableDataWrapper`.

4. **Prisma 7 uses driver adapter**: `PrismaPg` adapter in `lib/prisma.ts`. `$transaction` with interactive mode (`async (tx) => { ... }`) works.

5. **No existing `"use cache"` directives**: The codebase doesn't use Next.js 16 caching yet. Using `revalidatePath` for now; `updateTag` migration is a future optimization.

6. **`Patient & { createdByUserName }` is the natural DTO shape**: The existing `BOOKING_INCLUDE.patient.user` pattern already flattens Patient+User. The patients data layer extends this with `createdByUser` for the audit trail.

7. **Patient is simpler than Booking — by design**: No state machine, no time-bucketing, no availability, no cross-module writes. Three actions, four data functions, straightforward CRUD.
