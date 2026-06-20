# Patients Domain Specification

## Purpose

Pure domain layer for the Patient entity — a core aggregate representing clients within a business. TypeScript types, const objects, Zod 4 validation, and `patientMatches` deduplication. No persistence, I/O, or UI.

## Requirements

### Requirement: Patient Entity Type

The system MUST export a `Patient` type (`z.infer<typeof patientSchema>`) with:

| Field | Type | Req | Constraints |
|-------|------|-----|-------------|
| id | `string` (UUID) | y | — |
| organizationId | `string` (UUID) | y | — |
| fullName | `string` | y | 1–100 chars, trimmed |
| email | `string` | n | valid email format |
| phone | `string` | n | permissive (digits, spaces, dashes, parentheses, optional +) |
| documentId | `string` | n | Argentine DNI — 7–8 digits, no separators |
| status | `PatientStatusType` | y | ACTIVE, INACTIVE, or BLOCKED |
| notes | `string` | n | max 1000 chars |
| createdAt | `Date` | y | — |
| updatedAt | `Date` | y | — |

### Requirement: PatientData Type

The system MUST export a `PatientData` type (`z.infer<typeof patientDataSchema>`) for creation input — identical to `Patient` except `id`, `createdAt`, and `updatedAt` are omitted.

### Requirement: PatientStatus Constants

Export const-object-based constants (no TS enums):

| Constant | Values | Extracted type |
|----------|--------|----------------|
| `PatientStatus` | `ACTIVE:"ACTIVE"`, `INACTIVE:"INACTIVE"`, `BLOCKED:"BLOCKED"` | `PatientStatusType` |

Types MUST use `(typeof PatientStatus)[keyof typeof PatientStatus]`.

### Requirement: Patient Validation Schema

Zod 4 `patientSchema` using `z.object()`. No `superRefine` — no cross-field rules for this entity.

| # | Rule | Condition | Error |
|---|------|-----------|-------|
| 1 | Name required | `fullName` empty or `< 1 char` | "Full name is required" |
| 2 | Name max length | `fullName.length > 100` | "Full name must be 100 characters or less" |
| 3 | Valid email | `email` present ∧ not valid email | "Invalid email format" |
| 4 | Valid DNI | `documentId` present ∧ fails `/^\d{7,8}$/` | "Document ID must be 7-8 digits with no separators" |
| 5 | Valid status | `status` not in PatientStatus values | "Invalid patient status" |
| 6 | Notes max length | `notes.length > 1000` | "Notes must be 1000 characters or less" |
| 7 | Valid UUID | `id` or `organizationId` not valid UUID | "Invalid UUID" |

#### Scenario: Valid patient with all fields

- GIVEN fullName="María García", email="maria@example.com", phone="+54 11 5555-1234", documentId="30123456", status="ACTIVE", notes="Prefiere turnos mañana"
- WHEN parsed by patientSchema
- THEN parse succeeds

#### Scenario: Valid patient with minimal required fields

- GIVEN fullName="Juan Pérez", status="INACTIVE", no optional fields provided
- WHEN parsed by patientSchema
- THEN parse succeeds — email, phone, documentId, notes default to undefined

#### Scenario: Valid patient with BLOCKED status

- GIVEN fullName="Carlos López", status="BLOCKED"
- WHEN parsed by patientSchema
- THEN parse succeeds

#### Scenario: Rejects empty fullName

- GIVEN fullName=""
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 1)

#### Scenario: Rejects invalid email

- GIVEN email="not-an-email"
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 3)

#### Scenario: Rejects DNI with letters

- GIVEN documentId="AB123456"
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects DNI with wrong length

- GIVEN documentId="12345"
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects DNI with separators

- GIVEN documentId="30.123.456"
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 4)

#### Scenario: Rejects invalid status value

- GIVEN status="PENDING"
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 5)

#### Scenario: Rejects notes exceeding 1000 characters

- GIVEN notes is 1001 characters long
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 6)

#### Scenario: Rejects invalid UUID for id

- GIVEN id="not-a-uuid"
- WHEN parsed by patientSchema
- THEN validation FAILS (rule 7)

### Requirement: Patient Data Validation Schema

Zod 4 `patientDataSchema` — same rules as `patientSchema` (rules 1–6) but without `id` field.

#### Scenario: Valid creation input

- GIVEN fullName="Ana Torres", status="ACTIVE", email="ana@example.com", documentId="40123456"
- WHEN parsed by patientDataSchema
- THEN parse succeeds — no id required

#### Scenario: Rejects creation input with id present

- GIVEN fullName="Ana Torres", status="ACTIVE", id="some-uuid-here"
- WHEN parsed by patientDataSchema
- THEN validation FAILS — id is not a recognized field (strict)

### Requirement: Deduplication — patientMatches

The system MUST export `patientMatches(a: Patient | PatientData, b: Patient | PatientData): boolean`.

Returns true when ANY of:

1. Normalized fullName matches AND normalized email matches (both sides have email)
2. Normalized fullName matches AND normalized phone matches (both sides have phone)
3. documentId matches (both sides have documentId)

Normalization: `fullName` trimmed + lowercased; `email` trimmed + lowercased; `phone` compared as-is after trim. Null/undefined fields are skipped — only compare when both sides have the value.

#### Scenario: Match by fullName + email

- GIVEN a={fullName:"María García", email:"MARIA@example.com"}, b={fullName:"María   García", email:"maria@example.com"}
- WHEN patientMatches(a, b) is called
- THEN returns true — normalized name + normalized email match

#### Scenario: Match by fullName + phone

- GIVEN a={fullName:"Juan Pérez", phone:"+54 11 5555-1234"}, b={fullName:"juan pérez", phone:"+54 11 5555-1234"}
- WHEN patientMatches(a, b) is called
- THEN returns true — normalized name plus phone match

#### Scenario: Match by documentId

- GIVEN a={fullName:"Carlos López", documentId:"30123456"}, b={fullName:"C. López", documentId:"30123456"}
- WHEN patientMatches(a, b) is called
- THEN returns true — documentId matches even though fullName does not

#### Scenario: No match — different patients

- GIVEN a={fullName:"Ana Torres", email:"ana@test.com"}, b={fullName:"Pedro Ruiz", email:"pedro@test.com"}
- WHEN patientMatches(a, b) is called
- THEN returns false — nothing matches

#### Scenario: Null safety — email absent on one side

- GIVEN a={fullName:"María García"}, b={fullName:"María García", email:"maria@test.com"}
- WHEN patientMatches(a, b) is called
- THEN returns false — email only on one side, skip; fullName matches but no second criterion fulfilled

### Requirement: Barrel Export

`index.ts` MUST re-export all public symbols: `Patient`, `PatientData`, `PatientStatus`, `PatientStatusType`, `patientSchema`, `patientDataSchema`, `patientMatches`.
