# Delta for Patients Domain

## MODIFIED Requirements

### Requirement: Patient Entity Type (MODIFIED)

The Patient type SHALL add `createdByUserId: string` (UUID) for audit trail. All other fields unchanged.

(Previously: Patient had no `createdByUserId` field.)

| Field | Type | Req | Constraint |
|-------|------|-----|------------|
| createdByUserId | `string` (UUID) | y | `z.uuid()` — references User id |

#### Scenario: Patient includes createdByUserId

- GIVEN valid patient with `createdByUserId`
- WHEN parsed by `patientSchema`
- THEN parse succeeds

#### Scenario: Patient missing createdByUserId fails validation

- GIVEN patient without `createdByUserId`
- WHEN parsed by `patientSchema`
- THEN validation FAILS ("Invalid UUID")

### Requirement: Patient Validation Schema (MODIFIED)

`patientSchema` SHALL add `createdByUserId: z.uuid({ error: "Invalid UUID" })`. `patientDataSchema` MUST remain unchanged — `createdByUserId` is set by the action, not by creation input; `patientDataSchema.strict()` rejects unknown fields.

(Previously: schema had no `createdByUserId` field. `patientDataSchema` omits `id`, `createdAt`, `updatedAt` — unchanged.)

#### Scenario: Valid patient parses with createdByUserId

- GIVEN all fields valid including `createdByUserId`
- WHEN parsed by `patientSchema`
- THEN parse succeeds

#### Scenario: patientDataSchema rejects createdByUserId in strict mode

- GIVEN creation input includes `createdByUserId`
- WHEN parsed by `patientDataSchema`
- THEN validation FAILS — field not recognized

## ADDED Requirements

### Requirement: patients-data — Data Access Layer

Four pure async functions. First param `organizationId`. No React/Next.js. Flatten-on-read: JOIN Patient+User → domain `Patient` DTO.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPatients` | `(orgId, filters?) → PaginatedPatients` | Paginated list. Filters: `status`, `search` (name/email contains), `page` (1-indexed), `pageSize` (default 20). |
| `getPatientById` | `(orgId, id) → EnrichedPatient \| null` | Full detail with `createdByUserName` from User. Null if missing/wrong org. |
| `createPatient` | `(orgId, data, createdByUserId) → Patient` | `$transaction`: create User (name, email, role=PATIENT) → create Patient with `createdByUserId`. |
| `updatePatient` | `(orgId, id, data) → Patient` | `$transaction`: update User.name, User.email + Patient fields (phone, documentId, notes, status). |

Types: `PatientFilters` (status, search, page, pageSize), `PaginatedPatients` (patients, total, page, pageSize), `EnrichedPatient` (flattened Patient DTO + `createdByUserName`), `DEFAULT_PAGE_SIZE = 20`.

#### Scenario: getPatients with status filter and pagination

- GIVEN 5 ACTIVE, 3 BLOCKED patients
- WHEN `getPatients(orgId, { status: "BLOCKED", page: 1 })`
- THEN returns 3 patients, total=3

#### Scenario: getPatients with search filter (name match)

- GIVEN patient "María García" exists
- WHEN `getPatients(orgId, { search: "mar" })`
- THEN returns María via case-insensitive name/email match

#### Scenario: getPatientById returns enriched flat DTO

- GIVEN Patient(id="p1", userId="u1"), User(id="u1", name="Juan", email="juan@test.com")
- WHEN `getPatientById(orgId, "p1")`
- THEN returns `{ id:"p1", fullName:"Juan", email:"juan@test.com", createdByUserName:"Admin Pérez", ... }`

#### Scenario: getPatientById returns null for wrong org

- GIVEN patient belongs to org-A
- WHEN `getPatientById(orgB, patientId)`
- THEN returns null

#### Scenario: createPatient with dedup check via patientMatches

- GIVEN existing patient "María" with email "maria@test.com"
- WHEN createPatient with fullName="María García", email="MARIA@test.com"
- THEN `patientMatches` returns true → throws DedupError → action catches and aborts

#### Scenario: getPatients with page beyond available pages

- GIVEN 5 patients total, pageSize=20
- WHEN `getPatients(orgId, { page: 99 })`
- THEN returns empty array, total=5, page=99

#### Scenario: createPatient handles P2002 email uniqueness

- GIVEN User "juan@test.com" exists (different patient)
- WHEN createPatient with email "juan@test.com"
- THEN Prisma throws P2002 → data layer propagates → action maps to "Ya existe un usuario con ese email"

#### Scenario: createPatient rejects invalid documentId format

- GIVEN documentId="ABC123" (letters)
- WHEN `createPatient({ fullName: "Test", status: "ACTIVE", documentId: "ABC123" })`
- THEN Zod parse fails → "Document ID must be 7-8 digits with no separators"

#### Scenario: createPatient rejects notes exceeding 1000 characters

- GIVEN notes is 1001 characters long
- WHEN `createPatient({ fullName: "Test", status: "ACTIVE", notes: "a".repeat(1001) })`
- THEN Zod parse fails → "Notes must be 1000 characters or less"

#### Scenario: createPatient persists audit trail

- GIVEN `createdByUserId="admin-1"`
- WHEN createPatient succeeds
- THEN Patient.createdByUserId = "admin-1"

#### Scenario: updatePatient changes User email and Patient phone

- GIVEN Patient with userId="u1", User.email="old@test.com"
- WHEN `updatePatient(orgId, id, { email: "new@test.com", phone: "+54 11 5555-0001" })`
- THEN User.email="new@test.com", Patient.phone="+54 11 5555-0001"

### Requirement: patients-actions — Server Actions

Three `"use server"` actions. Each SHALL: Zod 4 validate input → `getOrganizationId()` → RBAC (reject PATIENT role) → execute → `revalidatePath("/dashboard/patients")` → return `PatientResult<T>`.

`PatientResult<T>` SHALL mirror `BookingResult<T>`: `{ success: true, data: T } | { success: false, error: string }`. Error messages in Spanish.

| Action | Schema | Returns |
|--------|--------|---------|
| `createPatient(data)` | Fields: fullName (req), email, phone, documentId, status (req), notes | `PatientResult<{ id }>` |
| `updatePatient(id, data)` | Fields: id (req) + PatientData fields (all optional) | `PatientResult<void>` |
| `changePatientStatus(id, status)` | Fields: id (req), status (req, enum ACTIVE/INACTIVE/BLOCKED) | `PatientResult<void>` |

`createPatient` SHALL run `patientMatches` dedup inside `$transaction`: fetch all org patients → compare against input → abort if match found. SHALL catch Prisma P2002 for duplicate email.

#### Scenario: createPatient rejects PATIENT role

- GIVEN session.user.role = "PATIENT"
- WHEN `createPatient(data)` called
- THEN returns `{ success: false, error: "No autorizado" }`

#### Scenario: createPatient rejects invalid input

- GIVEN fullName="" (empty)
- WHEN `createPatient({ fullName: "", status: "ACTIVE" })`
- THEN Zod parse fails → returns `{ success: false, error: "Full name is required" }`

#### Scenario: createPatient detects duplicate via patientMatches

- GIVEN existing patient with same normalized name + email
- WHEN createPatient with matching data
- THEN returns `{ success: false, error: "Ya existe un paciente con los mismos datos" }`

#### Scenario: createPatient handles P2002 duplicate email

- GIVEN User with email "juan@test.com" already exists
- WHEN createPatient with same email
- THEN catches P2002 → returns `{ success: false, error: "Ya existe un paciente con ese email" }`

#### Scenario: updatePatient rejects not found

- GIVEN nonexistent patientId
- WHEN `updatePatient(id, data)`
- THEN returns `{ success: false, error: "Paciente no encontrado" }`

#### Scenario: updatePatient validates id is UUID

- GIVEN id="not-a-uuid"
- WHEN `updatePatient(id, data)`
- THEN Zod parse fails → "ID de paciente inválido"

#### Scenario: changePatientStatus succeeds for valid transition

- GIVEN ACTIVE patient
- WHEN `changePatientStatus(id, "BLOCKED")`
- THEN status updates → `{ success: true }` → revalidates

#### Scenario: updatePatient rejects wrong organization

- GIVEN patient belongs to org-A, session org is org-B
- WHEN `updatePatient(id, data)` where id belongs to org-A
- THEN `getPatientById` returns null → returns `{ success: false, error: "Paciente no encontrado" }`

#### Scenario: changePatientStatus rejects invalid status

- GIVEN status="PENDING" (not in PatientStatus)
- WHEN `changePatientStatus(id, "PENDING")`
- THEN Zod parse fails → returns error

#### Scenario: changePatientStatus rejects wrong organization

- GIVEN patient belongs to org-A, session org is org-B
- WHEN `changePatientStatus(id, "ACTIVE")` where id belongs to org-A
- THEN `getPatientById` returns null → returns `{ success: false, error: "Paciente no encontrado" }`

### Requirement: patients-list — List Page

Route `/dashboard/patients` SHALL be a Server Component with `<Suspense>` wrapper.

- Search bar (`searchParams.search`) filters by name/email.
- Status filter (`searchParams.status`) with ACTIVE/INACTIVE/BLOCKED options.
- DataTable columns: Nombre, Email, Teléfono, DNI, Estado, Creado por.
- Status badges: Activo (green), Inactivo (gray), Bloqueado (red).
- Empty state when zero results: "No hay pacientes".
- Loading skeleton: 5 shimmer rows in Suspense fallback.
- RBAC: all authenticated roles view; PATIENT gated at dashboard layout.

#### Scenario: List renders all patients with search

- GIVEN 5 patients in org
- WHEN URL `/dashboard/patients`
- THEN table renders 5 rows, each with status badge

#### Scenario: List filters by status via searchParams

- GIVEN URL `/dashboard/patients?status=BLOCKED`
- WHEN page loads
- THEN only BLOCKED patients shown

#### Scenario: Empty state when zero matching patients

- GIVEN search="zzznotfound"
- WHEN page renders
- THEN "No hay pacientes" empty state displayed

#### Scenario: Loading skeleton pending data

- GIVEN page is in loading state
- WHEN Suspense fallback renders
- THEN 5 skeleton rows with shimmer animation shown

### Requirement: patients-detail — Detail Page

Route `/dashboard/patients/[id]` SHALL be a Server Component.

- `getPatientById(orgId, id)` → null → `notFound()` (404).
- Info cards: fullName, email, phone, documentId, status (badge), notes.
- "Creado por {createdByUserName}" audit display.
- Status change dropdown wired to `changePatientStatus` Server Action.
- Booking history table via `getBookings(orgId, { patientId })`.
- "Editar" button → `/dashboard/patients/[id]/edit`.

#### Scenario: Detail renders patient info with audit

- GIVEN patient "María García" created by "Admin Pérez"
- WHEN `/dashboard/patients/{id}` loads
- THEN shows name, email, phone, DNI, status badge, "Creado por Admin Pérez"

#### Scenario: Detail shows booking history for patient

- GIVEN patient has 3 bookings
- WHEN detail page renders
- THEN booking table shows date, service, status

#### Scenario: Status change from detail dropdown

- GIVEN ACTIVE patient on detail page
- WHEN user selects "Bloqueado" and confirms
- THEN `changePatientStatus(id, "BLOCKED")` fires → page revalidates

#### Scenario: Detail 404 for nonexistent patient

- GIVEN URL `/dashboard/patients/nonexistent-id`
- WHEN `getPatientById` returns null
- THEN `notFound()` triggers → 404 page rendered

#### Scenario: Detail displays fallback when createdByUserName is absent

- GIVEN patient where `createdByUserName` is null (User was deleted)
- WHEN detail page renders
- THEN audit line shows "Creado por —" (dash fallback)

#### Scenario: Detail 404 for wrong organization patient

- GIVEN patient belongs to org-A, session org is org-B
- WHEN `/dashboard/patients/{id}` loads
- THEN `getPatientById` returns null → `notFound()` → 404

### Requirement: patients-edit — Edit Page

Route `/dashboard/patients/[id]/edit` SHALL be a Client Component.

- Form pre-filled via `getPatientById(id)`.
- Fields: fullName, email, phone, documentId, notes.
- Client-side Zod 4 validation matching `patientDataSchema` rules (Spanish errors).
- On submit: calls `updatePatient` Server Action.
- Success redirects to detail page; error shown inline.
- "Cancelar" link to `/dashboard/patients/[id]`.
- RBAC: PATIENT role blocked at layout; action re-checks.

#### Scenario: Edit form pre-fills existing patient data

- GIVEN patient "Ana Torres" (email: ana@test.com, phone: "+54 11 5555-1234")
- WHEN edit page loads
- THEN form fields show pre-filled values

#### Scenario: Edit form validates empty name

- GIVEN user clears fullName and submits
- WHEN client-side validation runs
- THEN "Full name is required" error displayed

#### Scenario: Edit form validates invalid email format

- GIVEN user enters "bad-email"
- WHEN form submitted
- THEN "Invalid email format" error displayed

#### Scenario: Successful edit updates and revalidates

- GIVEN valid form changes submitted
- WHEN `updatePatient` returns `{ success: true }`
- THEN page revalidates → user sees success toast/redirect

#### Scenario: Edit form handles server-side error

- GIVEN server returns `{ success: false, error: "Ya existe un paciente con ese email" }`
- WHEN form submitted
- THEN error message displayed below email field

#### Scenario: Edit page 404 for nonexistent patient

- GIVEN URL `/dashboard/patients/nonexistent-id/edit`
- WHEN `getPatientById` returns null
- THEN `notFound()` triggers → 404 page rendered
