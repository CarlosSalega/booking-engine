# Professionals Presentation Specification

## Purpose

UI layer for professional management — list, detail, create, and edit pages. Server Components with Client Component islands for interactivity. All UI labels in Spanish (es-AR). RBAC: PROFESSIONAL role sees read-only views.

## Requirements

### Requirement: Professionals List Page

Route `/dashboard/professionals` SHALL be a Server Component with `<Suspense>` wrapper.

- Search bar (`searchParams.search`) filters by professional name/email.
- Status filter (`searchParams.status`) with ACTIVE/INACTIVE options.
- Pagination via `searchParams.page` (1-indexed, default 20).
- Columns: Nombre, Email, Especialidades, Matrícula, Estado.
- Status badge: Activo (green), Inactivo (gray).
- Specialties column formats array as comma-separated list.
- Empty state: "No hay profesionales".
- Loading skeleton: shimmer rows in Suspense fallback.
- RBAC: all authenticated roles view. PROFESSIONAL sees list without create/edit buttons.

#### Scenario: List renders professionals with search and status filter

- GIVEN 5 professionals, URL `/dashboard/professionals?status=ACTIVE&search=garcía`
- WHEN page loads
- THEN table shows only ACTIVE professionals matching "garcía"

#### Scenario: Empty state when zero results

- GIVEN search="zzznotfound"
- WHEN page renders
- THEN "No hay profesionales" displayed

#### Scenario: Loading skeleton during Suspense

- GIVEN page is in loading state
- WHEN Suspense fallback renders
- THEN shimmer skeleton rows shown

### Requirement: Professional Detail Page

Route `/dashboard/professionals/[id]` SHALL be a Server Component.

- `getProfessionalById(orgId, id)` → null → `notFound()` (404).
- Info display: fullName, email, image (avatar), specialties (chips/badges), license, bio, status badge.
- Status change toggle wired to `changeProfessionalStatus` Server Action.
- "Editar" button → `/dashboard/professionals/[id]/edit`.
- RBAC: PROFESSIONAL role sees read-only detail (no status toggle, no edit button if viewing another professional).

#### Scenario: Detail renders professional info with specialties

- GIVEN professional "Dr. García" with specialties=["Dermatología","Cirugía"], license="MN-12345"
- WHEN `/dashboard/professionals/{id}` loads
- THEN shows name, email, image, "Dermatología" + "Cirugía" badges, license, bio, Activo badge

#### Scenario: Status change toggle from detail

- GIVEN ACTIVE professional on detail page, ADMIN role
- WHEN user toggles status to "Inactivo"
- THEN `changeProfessionalStatus(id, "INACTIVE")` fires → page revalidates

#### Scenario: Detail 404 for nonexistent professional

- GIVEN URL `/dashboard/professionals/nonexistent-id`
- WHEN `getProfessionalById` returns null
- THEN `notFound()` triggers → 404 page rendered

#### Scenario: Detail hides status toggle for PROFESSIONAL role

- GIVEN session.user.role = "PROFESSIONAL"
- WHEN detail page renders
- THEN status toggle and edit button not rendered

### Requirement: Professional Create Page

Route `/dashboard/professionals/new` SHALL be a Client Component.

- Form: `ProfessionalForm` with fields: fullName, email, specialties (tag input — type + Enter to add, click × to remove), license, bio, status (select: Activo/Inactivo).
- Client-side Zod 4 validation via `professionalDataSchema` (Spanish errors).
- On submit: `createProfessional` Server Action → redirect to `/dashboard/professionals`.
- "Cancelar" link to `/dashboard/professionals`.
- RBAC: PROFESSIONAL role blocked at layout; action re-checks.

#### Scenario: Tag input for specialties

- GIVEN user types "Dermatología" and presses Enter
- WHEN form re-renders
- THEN "Dermatología" tag appears with × remove button in input area
- AND user can add more tags (max 10)

#### Scenario: Client-side validation rejects empty name

- GIVEN user submits form with fullName=""
- WHEN client-side Zod parse runs
- THEN "Full name must be 1-100 characters" error displayed

#### Scenario: Client-side validation rejects invalid email

- GIVEN user enters "bad-email"
- WHEN form submitted
- THEN "Invalid email format" error displayed

#### Scenario: Successful create redirects to list

- GIVEN valid form submitted
- WHEN `createProfessional` returns `{ success: true }`
- THEN page redirects to `/dashboard/professionals`

#### Scenario: Form displays server error inline

- GIVEN server returns `{ success: false, error: "Ya existe un usuario con ese email" }`
- WHEN form submitted
- THEN error message displayed below email field

### Requirement: Professional Edit Page

Route `/dashboard/professionals/[id]/edit` SHALL be a Client Component.

- Form pre-filled via `getProfessionalById(id)`.
- Fields: same `ProfessionalForm` as create — fullName, email, specialties, license, bio, status.
- On submit: `updateProfessional` Server Action → redirect to `/dashboard/professionals/[id]`.
- "Cancelar" link to `/dashboard/professionals/[id]`.
- `getProfessionalById` null → `notFound()`.

#### Scenario: Edit form pre-fills existing professional data

- GIVEN professional "Dr. García" (email: garcia@test.com, specialties=["Dermatología"], license="MN-12345", status="ACTIVE")
- WHEN edit page loads
- THEN all form fields show pre-filled values including tag chips for specialties

#### Scenario: Edit form validates empty name

- GIVEN user clears fullName and submits
- WHEN client-side validation runs
- THEN "Full name must be 1-100 characters" error displayed

#### Scenario: Successful update redirects to detail

- GIVEN valid form changes submitted
- WHEN `updateProfessional` returns `{ success: true }`
- THEN page redirects to `/dashboard/professionals/{id}` → detail shows updated data

#### Scenario: Edit form handles server-side error

- GIVEN server returns `{ success: false, error: "Ya existe un usuario con ese email" }`
- WHEN form submitted
- THEN error message displayed below email field

#### Scenario: Edit page 404 for nonexistent professional

- GIVEN URL `/dashboard/professionals/nonexistent-id/edit`
- WHEN `getProfessionalById` returns null
- THEN `notFound()` triggers → 404 page rendered
