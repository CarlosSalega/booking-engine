# Professionals Actions Specification

## Purpose

Server actions for Professional CRUD. Zod 4 validation, RBAC (ADMIN/SECRETARY write, PROFESSIONAL read-only), email dedup, Prisma error handling. All error messages in Spanish.

## Requirements

### Requirement: Action Result Type

All actions SHALL return `ProfessionalResult<T>`: `{ success: true, data: T } | { success: false, error: string }`. Error messages in Spanish.

### Requirement: Server Actions

Three `"use server"` actions. Each SHALL: Zod 4 validate input → `getOrganizationId()` → RBAC check → execute via data layer → `revalidatePath("/dashboard/professionals")` → return `ProfessionalResult<T>`.

| Action | Schema | RBAC | Returns |
|--------|--------|------|---------|
| `createProfessional` | fullName (req), email (req), specialties (req, 1–10), license?, bio?, status (req) | ADMIN, SECRETARY | `ProfessionalResult<{ id }>` |
| `updateProfessional` | id (req) + same fields (all optional) | ADMIN, SECRETARY | `ProfessionalResult<void>` |
| `changeProfessionalStatus` | id (req), status (req, ACTIVE/INACTIVE) | ADMIN, SECRETARY | `ProfessionalResult<void>` |

PROFESSIONAL role SHALL be rejected. PATIENT role gated at dashboard layout.

### Requirement: RBAC Enforcement

`createProfessional`, `updateProfessional`, and `changeProfessionalStatus` SHALL reject PROFESSIONAL role with `{ success: false, error: "No autorizado" }`. ADMIN and SECRETARY roles SHALL be permitted.

#### Scenario: createProfessional rejects PROFESSIONAL role

- GIVEN session.user.role = "PROFESSIONAL"
- WHEN `createProfessional(data)` called
- THEN returns `{ success: false, error: "No autorizado" }`

#### Scenario: createProfessional rejects invalid input

- GIVEN fullName="" (empty)
- WHEN `createProfessional({ fullName: "", email: "test@test.com", specialties: [], status: "ACTIVE" })`
- THEN Zod parse fails → returns `{ success: false, error: "Full name must be 1-100 characters" }`

#### Scenario: createProfessional succeeds for ADMIN

- GIVEN valid input, ADMIN role
- WHEN `createProfessional` called
- THEN professional persisted via split-write → `{ success: true, data: { id } }` → revalidates

#### Scenario: createProfessional handles P2002 duplicate email

- GIVEN User with email "garcia@test.com" already exists
- WHEN createProfessional with same email
- THEN catches P2002 → returns `{ success: false, error: "Ya existe un usuario con ese email" }`

#### Scenario: updateProfessional rejects not found

- GIVEN nonexistent professional id
- WHEN `updateProfessional(id, data)`
- THEN returns `{ success: false, error: "Profesional no encontrado" }`

#### Scenario: updateProfessional validates id is UUID

- GIVEN id="not-a-uuid"
- WHEN `updateProfessional(id, data)`
- THEN Zod parse fails → "ID de profesional inválido"

#### Scenario: updateProfessional rejects wrong organization

- GIVEN professional belongs to org-A, session org is org-B
- WHEN `updateProfessional(id, data)` where id belongs to org-A
- THEN `getProfessionalById` returns null → `{ success: false, error: "Profesional no encontrado" }`

#### Scenario: changeProfessionalStatus succeeds for valid transition

- GIVEN ACTIVE professional
- WHEN `changeProfessionalStatus(id, "INACTIVE")`
- THEN status updates → `{ success: true }` → revalidates

#### Scenario: changeProfessionalStatus rejects invalid status

- GIVEN status="PENDING" (not ACTIVE/INACTIVE)
- WHEN `changeProfessionalStatus(id, "PENDING")`
- THEN Zod parse fails → returns error

#### Scenario: changeProfessionalStatus rejects PROFESSIONAL role

- GIVEN session.user.role = "PROFESSIONAL"
- WHEN `changeProfessionalStatus(id, "ACTIVE")`
- THEN returns `{ success: false, error: "No autorizado" }`
