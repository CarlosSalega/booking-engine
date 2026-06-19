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
| fullName | `string` | y | 1–100 chars |
| specialty | `string` | n | max 100 chars |
| bio | `string` | n | max 1000 chars |
| avatarUrl | `string` | n | valid URL |
| status | `ProfessionalStatusType` | y | ACTIVE or INACTIVE |
| createdAt | `Date` | y | — |
| updatedAt | `Date` | y | — |

### Requirement: Domain Constants

Export const-object-based constants (no TS enums):

| Constant | Values | Extracted type |
|----------|--------|----------------|
| `ProfessionalStatus` | `ACTIVE:"ACTIVE"`, `INACTIVE:"INACTIVE"` | `ProfessionalStatusType` |

Types MUST use `(typeof CONST)[keyof typeof CONST]`.

### Requirement: Professional Validation Schema

Zod 4 `professionalSchema` using `z.object()`. No `superRefine` — no cross-field rules for this entity.

| # | Rule | Condition | Error |
|---|------|-----------|-------|
| 1 | Name required | `fullName` empty or `< 1 char` | "Full name must be 1-100 characters" |
| 2 | Name max length | `fullName.length > 100` | "Full name must be 1-100 characters" |
| 3 | Specialty max length | `specialty.length > 100` | "Specialty max 100 characters" |
| 4 | Bio max length | `bio.length > 1000` | "Bio max 1000 characters" |
| 5 | Valid URL | `avatarUrl` present ∧ not valid URL | "Avatar must be a valid URL" |
| 6 | Valid UUID | `id` or `organizationId` not valid UUID | "Invalid UUID" |
| 7 | Valid status | `status` not ACTIVE or INACTIVE | "Invalid status" |

#### Scenario: Valid active professional with all fields
- GIVEN fullName="Dr. García", specialty="Dermatología", bio="15 years of experience", avatarUrl="https://example.com/avatar.jpg", status="ACTIVE"
- WHEN parsed by professionalSchema
- THEN parse succeeds

#### Scenario: Valid professional with minimal fields
- GIVEN fullName="Dr. García", status="ACTIVE", no optional fields provided
- WHEN parsed by professionalSchema
- THEN parse succeeds

#### Scenario: Valid inactive professional
- GIVEN fullName="Dr. García", status="INACTIVE"
- WHEN parsed by professionalSchema
- THEN parse succeeds

#### Scenario: Rejects empty fullName
- GIVEN fullName=""
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 1)

#### Scenario: Rejects fullName exceeding 100 characters
- GIVEN fullName is 101 characters long
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 2)

#### Scenario: Rejects specialty exceeding 100 characters
- GIVEN specialty is 101 characters long
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 3)

#### Scenario: Rejects bio exceeding 1000 characters
- GIVEN bio is 1001 characters long
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects invalid avatarUrl
- GIVEN avatarUrl="not-a-valid-url"
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 5)

#### Scenario: Rejects invalid UUID for id
- GIVEN id="not-a-uuid-format"
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 6)

#### Scenario: Rejects invalid status value
- GIVEN status="PENDING"
- WHEN parsed by professionalSchema
- THEN validation FAILS (rule 7)

#### Scenario: Professional without optional fields accepted
- GIVEN fullName="Dr. López", status="ACTIVE", specialty=undefined, bio=undefined, avatarUrl=undefined
- WHEN parsed by professionalSchema
- THEN parse succeeds with only required fields

### Requirement: Barrel Export

`index.ts` MUST re-export all public symbols: `Professional`, `ProfessionalStatus`, `ProfessionalStatusType`, `professionalSchema`.
