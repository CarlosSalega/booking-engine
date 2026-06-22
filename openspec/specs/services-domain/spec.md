# Services Domain Specification

## Purpose

Defines the Service entity — a core aggregate for work offered by a business. Pure domain layer: TypeScript types, constants, and Zod 4 validation. No persistence, I/O, or UI.

## Requirements

### Requirement: Service Entity Type

The system MUST export a `Service` type (`z.infer<typeof serviceSchema>`) with:

| Field | Type | Req | Constraints |
|-------|------|-----|-------------|
| id | `string` (UUID) | y | — |
| organizationId | `string` (UUID) | y | — |
| name | `string` | y | 1–100 chars |
| description | `string` | n | max 500 chars |
| durationMinutes | `number` | y | positive integer |
| price | `Money` | n | — |
| status | `ServiceStatusType` | y | ACTIVE or INACTIVE |
| paymentType | `PaymentTypeType` | y | NONE / DEPOSIT / FULL |
| depositAmount | `Money` | n | required when DEPOSIT; ≤ price |
| createdAt | `Date` | y | — |
| updatedAt | `Date` | y | — |

`professionalId` is intentionally excluded from the domain `Service` type — services are org-level catalog items. The data layer SHALL accept `professionalId` as input and expose it in the `EnrichedService` DTO alongside `professionalName`. This is a persistence bridge, not a domain concern.

(Previously: No professionalId documentation — field existed only in Prisma model, not acknowledged in spec.)

#### Scenario: professionalId absent from domain Service type

- GIVEN a valid domain `Service` parsed by `serviceSchema`
- WHEN inspected for `professionalId`
- THEN the field is absent — present only in `EnrichedService` DTO and create/update inputs

### Requirement: Money Value Object

| Field | Type | Constraints |
|-------|------|-------------|
| amount | `number` | positive, max 2 decimals |
| currency | `CurrencyType` | "ARS" or "USD" |

#### Scenario: Rejects negative amount
- GIVEN amount=-100, currency="ARS"
- WHEN parsed by moneySchema
- THEN validation FAILS

#### Scenario: Rejects invalid currency
- GIVEN amount=100, currency="EUR"
- WHEN parsed by moneySchema
- THEN validation FAILS

### Requirement: Domain Constants

Export const-object-based constants (no TS enums):

| Constant | Values | Extracted type |
|----------|--------|----------------|
| `ServiceStatus` | `ACTIVE:"ACTIVE"`, `INACTIVE:"INACTIVE"` | `ServiceStatusType` |
| `PaymentType` | `NONE:"NONE"`, `DEPOSIT:"DEPOSIT"`, `FULL:"FULL"` | `PaymentTypeType` |
| `Currency` | `ARS:"ARS"`, `USD:"USD"` | `CurrencyType` |
| `DEFAULT_DURATION_MINUTES` | `30` | `number` |

Types MUST use `(typeof CONST)[keyof typeof CONST]`.

### Requirement: Service Validation Schema

Zod 4 `serviceSchema` using `z.object()` with `superRefine` for cross-field rules:

| # | Rule | Condition | Error |
|---|------|-----------|-------|
| 1 | DEPOSIT needs depositAmount | `paymentType="DEPOSIT"` ∧ no `depositAmount` | "Deposit is required for DEPOSIT payment type" |
| 2 | Deposit ≤ price | `depositAmount.amount > price.amount` | "Deposit must not exceed price" |
| 3 | NONE forbids deposit | `paymentType="NONE"` ∧ `depositAmount` present | "Deposit not allowed for NONE payment type" |
| 4 | Positive duration | `durationMinutes < 1` | "Duration must be a positive integer" |
| 5 | Name length | `< 1` or `> 100` chars | "Name must be 1-100 characters" |
| 6 | Description length | `> 500` chars | "Description max 500 characters" |

#### Scenario: Valid service — NONE payment
- GIVEN name="Consulta", durationMinutes=30, paymentType="NONE", status="ACTIVE"
- WHEN parsed by serviceSchema
- THEN parse succeeds

#### Scenario: Valid service — DEPOSIT payment
- GIVEN paymentType="DEPOSIT", price={amount:2000,currency:"ARS"}, depositAmount={amount:500,currency:"ARS"}
- WHEN parsed by serviceSchema
- THEN parse succeeds

#### Scenario: Valid service — FULL payment
- GIVEN paymentType="FULL", price={amount:3000,currency:"USD"}, no depositAmount
- WHEN parsed by serviceSchema
- THEN parse succeeds

#### Scenario: Rejects DEPOSIT without depositAmount
- GIVEN paymentType="DEPOSIT", price present, depositAmount=undefined
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 1)

#### Scenario: Rejects deposit exceeding price
- GIVEN price={amount:1000}, depositAmount={amount:1500}
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 2)

#### Scenario: Rejects negative duration
- GIVEN durationMinutes=-5
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects empty name
- GIVEN name=""
- WHEN parsed by serviceSchema
- THEN validation FAILS (rule 5)

#### Scenario: Service status transitions
- GIVEN a valid service with status="ACTIVE"
- WHEN the same payload is parsed with status="INACTIVE"
- THEN both parse successfully — enforcement at application layer

### Requirement: Barrel Export

`index.ts` MUST re-export all public symbols: `Service`, `Money`, `ServiceStatus`, `PaymentType`, `Currency`, derived types (`ServiceStatusType`, `PaymentTypeType`, `CurrencyType`), `DEFAULT_DURATION_MINUTES`, `serviceSchema`, `moneySchema`.

### Requirement: services-data — Data Access Layer

Five pure async functions, first param `organizationId`. No React/Next.js. Flatten-on-read: Money→Float mapping with ARS currency hardcoded.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getServices` | `(orgId, filters?) → PaginatedServices` | Paginated list. Filters: `status`, `search` (name contains), `professionalId`, `page` (1-indexed), `pageSize` (default 20). |
| `getServiceById` | `(orgId, id) → EnrichedService \| null` | Single service with `professionalName` via JOIN Professional→User. Null if missing/wrong org. |
| `createService` | `(orgId, input) → Service` | Creates service. Maps Money→Float: `price.amount`, `depositAmount?.amount`. Accepts `professionalId` (not in domain). |
| `updateService` | `(orgId, id, input) → Service` | Partial update. Same Money→Float mapping. Checks org ownership. |
| `changeServiceStatus` | `(orgId, id, status) → Service` | Toggle ACTIVE↔INACTIVE. No state machine — any transition valid. |

Types: `ServiceFilters`, `PaginatedServices` (services, total, page, pageSize), `EnrichedService` (Service + professionalId + professionalName), `CreateServiceInput`, `UpdateServiceInput`.

Read mapping: `price: Float` → `{ amount, currency: "ARS" }`. Write: flatten `price.amount` → Float. `paymentStatus` on Prisma Service model SHALL be ignored — not read, not exposed.

#### Scenario: getServices with status filter and pagination

- GIVEN 3 ACTIVE, 2 INACTIVE services in org
- WHEN `getServices(orgId, { status: "INACTIVE", page: 1 })`
- THEN returns 2 services, total=2

#### Scenario: getServiceById returns enriched DTO, null for wrong org

- GIVEN service(id="s1", professionalId="p1"), Professional→User.name="Dr. García"
- WHEN `getServiceById(orgId, "s1")`
- THEN returns DTO with `professionalName: "Dr. García"` and `professionalId: "p1"`
- AND `getServiceById(wrongOrgId, "s1")` returns null

#### Scenario: createService maps Money to Float

- GIVEN input with `price: { amount: 2000, currency: "ARS" }`
- WHEN `createService` called
- THEN Prisma receives `price: 2000` (Float), currency dropped

#### Scenario: updateService partial — only name changed

- GIVEN existing service with price=1000
- WHEN `updateService(orgId, id, { name: "New Name" })`
- THEN name updated, all other fields unchanged

#### Scenario: depositAmount persisted via data layer

- GIVEN `createService` input with `paymentType: "DEPOSIT"`, `depositAmount: { amount: 500, currency: "ARS" }`
- WHEN persisted
- THEN `depositAmount` column stores 500 (Float)

### Requirement: services-actions — Server Actions

Three `"use server"` actions. Each SHALL: Zod 4 validate input → `getOrganizationId()` → RBAC → execute → `revalidatePath("/dashboard/services")` → return `ServiceResult<T>`.

`ServiceResult<T>`: `{ success: true, data: T } | { success: false, error: string }`. Errors in Spanish.

| Action | Schema Zod 4 | RBAC | Returns |
|--------|-------------|------|---------|
| `createService` | name, description?, durationMinutes, price?, paymentType, depositAmount?, professionalId | ADMIN, SECRETARY | `ServiceResult<{ id }>` |
| `updateService` | id + same fields (all optional) | ADMIN, SECRETARY | `ServiceResult<void>` |
| `changeServiceStatus` | id + status (ACTIVE/INACTIVE) | ADMIN, SECRETARY | `ServiceResult<void>` |

PROFESSIONAL role SHALL be rejected. PATIENT role gated at dashboard layout.

#### Scenario: createService rejects PROFESSIONAL role

- GIVEN session.user.role = "PROFESSIONAL"
- WHEN `createService(data)` called
- THEN returns `{ success: false, error: "No autorizado" }`

#### Scenario: createService validates input with Zod 4

- GIVEN name="" (empty)
- WHEN `createService({ name: "", ... })`
- THEN Zod parse fails → returns `{ success: false, error: "Name must be 1-100 characters" }`

#### Scenario: createService succeeds for ADMIN

- GIVEN valid input, ADMIN role, professional exists in org
- WHEN `createService` called
- THEN service persisted → `{ success: true, data: { id } }` → revalidates

#### Scenario: changeServiceStatus — no state machine

- GIVEN INACTIVE service
- WHEN `changeServiceStatus(id, "ACTIVE")`
- THEN status updates → `{ success: true }` — any transition valid

#### Scenario: updateService returns not-found for wrong org

- GIVEN service in org-A, session org is org-B
- WHEN `updateService(serviceId, data)`
- THEN `getServiceById` returns null → `{ success: false, error: "Servicio no encontrado" }`

### Requirement: services-list — List Page

Route `/dashboard/services` SHALL be a Server Component with `<Suspense>` wrapper.

- Search bar (`searchParams.search`) filters by service name.
- Status filter (`searchParams.status`) with ACTIVE/INACTIVE options.
- Pagination via `searchParams.page` (1-indexed).
- Columns: Nombre, Profesional, Duración, Precio, Estado.
- Status badge: Activo (green), Inactivo (gray).
- Empty state: "No hay servicios".
- Loading skeleton: shimmer rows in Suspense fallback.
- RBAC: all authenticated roles view. PROFESSIONAL sees read-only (no create/edit buttons).

#### Scenario: List renders services with search + status filter

- GIVEN 5 services in org, URL `/dashboard/services?status=ACTIVE&search=consulta`
- WHEN page loads
- THEN table shows only ACTIVE services matching "consulta"

#### Scenario: Empty state when zero results

- GIVEN search="zzznotfound"
- WHEN page renders
- THEN "No hay servicios" displayed

#### Scenario: Loading skeleton during Suspense

- GIVEN page is in loading state
- WHEN Suspense fallback renders
- THEN shimmer skeleton rows shown

### Requirement: services-detail — Detail Page

Route `/dashboard/services/[id]` SHALL be a Server Component.

- `getServiceById(orgId, id)` → null → `notFound()` (404).
- Displays: name, description, durationMinutes, price (formatted with $), status badge, paymentType badge, professionalName.
- "Editar" button → `/dashboard/services/[id]/edit`.

#### Scenario: Detail renders with professional name and status badge

- GIVEN service "Consulta General" (ACTIVE, $2000, Dr. García)
- WHEN `/dashboard/services/{id}` loads
- THEN shows all fields, green "Activo" badge, "Profesional: Dr. García"

#### Scenario: Detail 404 for nonexistent or wrong-org service

- GIVEN service belongs to org-A, session org is org-B
- WHEN `/dashboard/services/{id}` loads
- THEN `getServiceById` returns null → `notFound()` → 404

### Requirement: services-create — Create Page

Route `/dashboard/services/new` SHALL be a Client Component.

- Form fields: name, description, durationMinutes (default 30), price.amount, paymentType, depositAmount.amount (shown only when paymentType=DEPOSIT), professionalId (dropdown from org professionals).
- Client-side Zod 4 validation via `serviceSchema` (Spanish errors).
- On submit: `createService` Server Action → redirect to `/dashboard/services`.
- "Cancelar" link to `/dashboard/services`.

#### Scenario: depositAmount field conditional on paymentType

- GIVEN user selects paymentType="DEPOSIT"
- WHEN form re-renders
- THEN depositAmount field appears with required validation
- AND selecting "NONE" hides depositAmount field

#### Scenario: Client-side validation rejects empty name

- GIVEN user submits form with name=""
- WHEN client-side Zod parse runs
- THEN "Name must be 1-100 characters" error displayed

#### Scenario: Successful create redirects to list

- GIVEN valid form submitted
- WHEN `createService` returns `{ success: true }`
- THEN page redirects to `/dashboard/services`

### Requirement: services-edit — Edit Page

Route `/dashboard/services/[id]/edit` SHALL be a Client Component.

- Form pre-filled via `getServiceById(id)`.
- Fields: same as create — name, description, durationMinutes, price.amount, paymentType, depositAmount.amount, professionalId.
- On submit: `updateService` Server Action → redirect to `/dashboard/services/[id]`.
- "Cancelar" link to `/dashboard/services/[id]`.
- `getServiceById` null → `notFound()`.

#### Scenario: Form pre-fills existing service data

- GIVEN service "Consulta General" (60min, $2000, DEPOSIT, deposit=$500)
- WHEN edit page loads
- THEN all fields pre-filled with current values

#### Scenario: Successful update redirects to detail

- GIVEN valid form changes submitted
- WHEN `updateService` returns `{ success: true }`
- THEN page redirects to `/dashboard/services/{id}`

#### Scenario: Server error displayed inline

- GIVEN server returns `{ success: false, error: "Servicio no encontrado" }`
- WHEN form submitted
- THEN error message displayed above form
