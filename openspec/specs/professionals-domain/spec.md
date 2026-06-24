# Professionals Domain Specification

## Purpose

Pure domain layer for the Professional entity — a core aggregate representing service providers within a business. TypeScript types, const objects, and Zod 4 validation. No persistence, I/O, or UI.

## Requirements

### Requirement: Professional Entity Type

The system MUST export a `Professional` type (`z.infer<typeof professionalSchema>`) with:

| Field | Type | Req | Constraints |
|-------|------|-----|-------------|
| id | `string` (UUID) | y | — |
| organizationId | `string` (UUID) | y | — |
| userId | `string` (UUID) | y | Linked User record |
| fullName | `string` | y | 1–100 chars, from `user.name` |
| email | `string` | y | valid email, from `user.email` |
| image | `string` | n | valid URL, from `user.image` |
| specialties | `string[]` | y | 1–10 items, each 1–100 chars |
| license | `string` | n | max 50 chars |
| bio | `string` | n | max 1000 chars |
| status | `ProfessionalStatusType` | y | ACTIVE or INACTIVE |
| createdAt | `Date` | y | — |
| updatedAt | `Date` | y | — |

#### Scenario: Valid active professional with all fields
- GIVEN fullName="Dr. García", email="garcia@test.com", specialties=["Dermatología","Cirugía"], license="MN-12345", bio="15 years", image="https://example.com/avatar.jpg", status="ACTIVE"
- WHEN parsed by professionalSchema
- THEN parse succeeds

#### Scenario: Valid professional with minimal fields
- GIVEN fullName="Dr. García", email="garcia@test.com", specialties=["Dermatología"], status="ACTIVE"
- WHEN parsed by professionalSchema
- THEN parse succeeds — license, bio, image default to undefined

#### Scenario: Rejects empty fullName
- GIVEN fullName=""
- WHEN parsed by professionalSchema
- THEN validation FAILS ("Full name must be 1-100 characters")

#### Scenario: Rejects invalid email
- GIVEN email="not-an-email"
- WHEN parsed by professionalSchema
- THEN validation FAILS ("Invalid email format")

#### Scenario: Rejects empty specialties array
- GIVEN specialties=[]
- WHEN parsed by professionalSchema
- THEN validation FAILS ("At least one specialty is required")

#### Scenario: Rejects specialties exceeding 10 items
- GIVEN specialties is 11 items
- WHEN parsed by professionalSchema
- THEN validation FAILS

#### Scenario: Rejects bio exceeding 1000 characters
- GIVEN bio is 1001 characters long
- WHEN parsed by professionalSchema
- THEN validation FAILS ("Bio max 1000 characters")

#### Scenario: Rejects invalid image URL
- GIVEN image="not-a-valid-url"
- WHEN parsed by professionalSchema
- THEN validation FAILS ("Image must be a valid URL")

#### Scenario: Rejects invalid status value
- GIVEN status="PENDING"
- WHEN parsed by professionalSchema
- THEN validation FAILS ("Invalid status")

### Requirement: Domain Constants

Export const-object-based constants (no TS enums):

| Constant | Values | Extracted type |
|----------|--------|----------------|
| `ProfessionalStatus` | `ACTIVE:"ACTIVE"`, `INACTIVE:"INACTIVE"` | `ProfessionalStatusType` |

Types MUST use `(typeof CONST)[keyof typeof CONST]`.

### Requirement: Professional Validation Schema

Zod 4 `professionalSchema` using `z.object()`. No `superRefine` — no cross-field rules.

| # | Rule | Condition | Error |
|---|------|-----------|-------|
| 1 | Name required | `fullName` empty or `< 1 char` | "Full name must be 1-100 characters" |
| 2 | Name max length | `fullName.length > 100` | "Full name must be 1-100 characters" |
| 3 | Valid email | `email` present ∧ not valid email | "Invalid email format" |
| 4 | Specialties min 1 | `specialties.length < 1` | "At least one specialty is required" |
| 5 | Specialties max 10 | `specialties.length > 10` | "Maximum 10 specialties" |
| 6 | Specialty item length | any item `< 1` or `> 100` chars | "Each specialty must be 1-100 characters" |
| 7 | License max length | `license.length > 50` | "License max 50 characters" |
| 8 | Bio max length | `bio.length > 1000` | "Bio max 1000 characters" |
| 9 | Valid image URL | `image` present ∧ not valid URL | "Image must be a valid URL" |
| 10 | Valid UUID | `id`, `organizationId`, or `userId` not valid UUID | "Invalid UUID" |
| 11 | Valid status | `status` not ACTIVE or INACTIVE | "Invalid status" |

#### Scenario: Valid active professional with all fields
- GIVEN fullName="Dr. García", email="garcia@test.com", specialties=["Dermatología"], status="ACTIVE"
- WHEN parsed by professionalSchema
- THEN parse succeeds

#### Scenario: Valid professional with minimal fields
- GIVEN fullName="Dr. García", email="garcia@test.com", specialties=["Dermatología"], status="ACTIVE"
- WHEN parsed by professionalSchema
- THEN parse succeeds — optional fields default to undefined

#### Scenario: Rejects empty specialties array
- GIVEN specialties=[]
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects specialty item exceeding 100 characters
- GIVEN specialties includes a 101-char string
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 6)

#### Scenario: Rejects email with invalid format
- GIVEN email="bad"
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 3)

#### Scenario: Rejects license exceeding 50 characters
- GIVEN license is 51 characters long
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 7)

### Requirement: Barrel Export

`index.ts` MUST re-export all public symbols: `Professional`, `ProfessionalData`, `ProfessionalStatus`, `ProfessionalStatusType`, `professionalSchema`, `professionalDataSchema`.

### Requirement: ProfessionalData Type

The system MUST export a `ProfessionalData` type (`z.infer<typeof professionalDataSchema>`) for creation input — identical to `Professional` except `id`, `organizationId`, `userId`, `image`, `createdAt`, and `updatedAt` are omitted. `professionalDataSchema.strict()` SHALL reject unknown fields.

#### Scenario: ProfessionalData accepts valid creation input
- GIVEN fullName="Dr. García", email="garcia@test.com", specialties=["Dermatología"], status="ACTIVE"
- WHEN parsed by professionalDataSchema
- THEN parse succeeds — id, userId, image, timestamps absent

#### Scenario: ProfessionalData rejects extra fields in strict mode
- GIVEN creation input includes `id` or `userId`
- WHEN parsed by professionalDataSchema
- THEN validation FAILS — field not recognized
