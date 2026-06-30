# Settings Domain Specification

## Purpose
Organization-wide configuration: `OrganizationSettings` entity (1 row per `organizationId`), Zod 4 validation, cached repository contract for global booking-engine behavior rules.

## Requirements

### Requirement: OrganizationSettings Entity
The system MUST export `OrganizationSettings` and `OrganizationSettingsInput`:

| Field | Type | Req | Constraint |
|-------|------|-----|------------|
| id | UUID string | y | `z.uuid()` |
| organizationId | UUID string | y | `z.uuid()` |
| name | string | y | 1-100 chars |
| description | string | n | max 500 |
| address | string | n | max 200 |
| timezone | string | y | IANA tz (default `"America/Argentina/Buenos_Aires"`) |
| phone | string | n | `z.string().regex(phone)`.optional() |
| email | string | n | `z.email().optional()` |
| defaultDurationMinutes | number | y | 5-480, default 30 |
| minAdvanceBookingHours | number | y | 0-168, default 1 |
| maxBookingsPerDay | number | y | 1-200, default 50 |
| bufferMinutes | number | y | 0-120, default 0 |
| cancellationEnabled | boolean | y | default true |
| cancellationLimitHours | number | y | 0-168, default 24 |
| createdAt, updatedAt | Date | y | `z.date()` |

`OrganizationSettingsInput` SHALL omit `id`, `createdAt`, `updatedAt`.

#### Scenario: Valid full settings
- GIVEN all required and optional fields with valid values → THEN parse succeeds

#### Scenario: Minimal settings (defaults)
- GIVEN only organizationId → THEN missing fields fill from defaults defined in domain constants

#### Scenario: Rejects negative duration
- GIVEN defaultDurationMinutes=-5 → THEN fails ("Must be 5–480")

#### Scenario: Rejects missing timezone
- GIVEN timezone="" → THEN fails ("Timezone required")

### Requirement: Domain Constants
The system MUST export `SETTINGS_DEFAULTS` const object with all default values matching the table above. `SettingsDefaults` type SHALL be extracted via `typeof`.

#### Scenario: Default timezone is argentina
- GIVEN no stored timezone → THEN defaults to `"America/Argentina/Buenos_Aires"`

#### Scenario: Default booking constraints
- GIVEN no stored booking config → THEN defaultDurationMinutes=30, minAdvanceBookingHours=1, maxBookingsPerDay=50, bufferMinutes=0

### Requirement: Validation Schemas
The system MUST export Zod 4 schemas: `businessConfigSchema`, `bookingConfigSchema`, `cancellationConfigSchema`, and composed `updateSettingsSchema` (partial of all three). `updateSettingsSchema` MUST use `strict()` (no unknown keys). Per-section schemas SHALL use `.strip()`.

#### Scenario: Partial update succeeds
- GIVEN `{ name: "New Name" }` only → THEN `updateSettingsSchema.safeParse()` returns success

#### Scenario: Unknown field rejected
- GIVEN input includes `unknownField: 1` → THEN fails ("Unrecognized key")

#### Scenario: Invalid email rejected
- GIVEN `{ email: "bad" }` → THEN fails ("Invalid email")

### Requirement: Repository Contract
The system MUST export `SettingsRepository` interface:

| Method | Signature |
|--------|-----------|
| `getByOrgId` | `(orgId: string) => Promise<OrganizationSettings \| null>` |
| `upsert` | `(orgId: string, data: Partial<OrganizationSettingsInput>) => Promise<OrganizationSettings>` |

Upsert MUST create on first call, update on subsequent calls for the same `organizationId`.

#### Scenario: First upsert creates
- GIVEN no settings for org "abc" → WHEN `upsert("abc", { name: "Clinic" })` → THEN created row, all other fields defaulted

#### Scenario: Second upsert updates
- GIVEN existing settings for org "abc" → WHEN `upsert("abc", { name: "New Clinic" })` → THEN row updated, unchanged fields preserved

### Requirement: Cache Layer
`getSettings(orgId)` MUST use `"use cache"` + `cacheTag("settings")` + `cacheLife(300)`. All Server Actions that write settings MUST call `updateTag("settings")` after successful write for SWR background revalidation.

#### Scenario: Cache hit
- GIVEN settings cached for org "abc" → WHEN `getSettings("abc")` called again within 300s → THEN returns cached value without DB query

#### Scenario: Cache invalidation on write
- GIVEN cached settings for org "abc" → WHEN upsert writes new data → THEN next `getSettings("abc")` returns fresh data (SWR path)
