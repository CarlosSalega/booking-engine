# Professionals Data Specification

## Purpose

Data access layer for Professional entities. Pure async repository functions with Prisma. Flatten-on-read from `User` relation, split-write via `$transaction`. No React/Next.js dependencies.

## Requirements

### Requirement: Repository Functions

Four pure async functions. First param `organizationId`. Flatten-on-read: JOIN Professional+User → domain `Professional` DTO.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getProfessionals` | `(orgId, filters?) → PaginatedProfessionals` | Paginated list. Filters: `status`, `search` (name/email contains), `page` (1-indexed), `pageSize` (default 20). |
| `getProfessionalById` | `(orgId, id) → Professional \| null` | Single professional with User flattening. Null if missing/wrong org. |
| `createProfessional` | `(orgId, data, userId?) → Professional` | `$transaction`: create User (name, email, role=PROFESSIONAL) → create Professional. Uses provided `userId` or creates new User. |
| `updateProfessional` | `(orgId, id, data) → Professional` | `$transaction`: update User.name, User.email + Professional fields (specialties, license, bio). P2025 → throws NotFoundError. |

Types: `ProfessionalFilters` (status, search, page, pageSize), `PaginatedProfessionals` (professionals, total, page, pageSize), `DEFAULT_PAGE_SIZE = 20`.

### Requirement: Flatten-on-Read Mapping

Read mapping SHALL flatten `user.name → fullName`, `user.email → email`, `user.image → image` into the Professional DTO. The `User` relation SHALL be `include`d in every read query.

#### Scenario: getProfessionals with status filter and pagination

- GIVEN 5 ACTIVE, 3 INACTIVE professionals
- WHEN `getProfessionals(orgId, { status: "INACTIVE", page: 1 })`
- THEN returns 3 professionals, total=3

#### Scenario: getProfessionals with search filter

- GIVEN professional "Dr. García" (user.email="garcia@test.com")
- WHEN `getProfessionals(orgId, { search: "gar" })`
- THEN returns Dr. García via case-insensitive name/email match

#### Scenario: getProfessionalById returns flattened DTO

- GIVEN Professional(id="p1", userId="u1"), User(id="u1", name="Dr. García", email="garcia@test.com", image="https://img.example/1.jpg")
- WHEN `getProfessionalById(orgId, "p1")`
- THEN returns `{ id:"p1", userId:"u1", fullName:"Dr. García", email:"garcia@test.com", image:"https://img.example/1.jpg", specialties:[...], ... }`

#### Scenario: getProfessionalById returns null for wrong org

- GIVEN professional belongs to org-A
- WHEN `getProfessionalById(orgB, professionalId)`
- THEN returns null

#### Scenario: getProfessionals with page beyond available pages

- GIVEN 5 professionals total, pageSize=20
- WHEN `getProfessionals(orgId, { page: 99 })`
- THEN returns empty array, total=5, page=99

#### Scenario: createProfessional split-write creates User + Professional in transaction

- GIVEN fullName="Dr. García", email="garcia@test.com", specialties=["Dermatología"]
- WHEN `createProfessional(orgId, data)`
- THEN `$transaction([createUser, createProfessional])` persists both rows atomically
- AND returned DTO includes fullName, email, image from new User

#### Scenario: updateProfessional updates User and Professional fields

- GIVEN Professional with userId="u1", User.email="old@test.com"
- WHEN `updateProfessional(orgId, id, { fullName: "Dr. García Updated", email: "new@test.com", specialties: ["Cirugía"] })`
- THEN User.name="Dr. García Updated", User.email="new@test.com", Professional.specialties=["Cirugía"]

#### Scenario: updateProfessional throws NotFoundError for missing record

- GIVEN nonexistent professional id
- WHEN `updateProfessional(orgId, "nonexistent", data)`
- THEN Prisma P2025 caught → throws NotFoundError

#### Scenario: createProfessional handles P2002 email uniqueness

- GIVEN User "garcia@test.com" already exists
- WHEN `createProfessional(orgId, { fullName: "Another", email: "garcia@test.com", ... })`
- THEN Prisma throws P2002 → data layer propagates → action handles
