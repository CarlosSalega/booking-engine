# Delta for Auth Core

## ADDED Requirements

### Requirement: Settings Permissions
The system MUST add `settings:manage` and `settings:view` to the `ROLE_PERMISSIONS` RBAC map:

| Permission | ADMIN | SECRETARY | PROFESSIONAL | PATIENT |
|------------|-------|-----------|--------------|---------|
| `settings:manage` | ✓ | — | — | — |
| `settings:view` | ✓ | ✓ | — | — |

- `settings:manage` SHALL grant full read/write access to all settings sections (Business, Bookings, Cancellations).
- `settings:view` SHALL grant read-only access to view settings values; form fields rendered disabled.
- Roles without either permission SHALL be redirected with "Access denied" when navigating to `/dashboard/settings`.

#### Scenario: Admin has both permissions
- GIVEN role=ADMIN → THEN ROLE_PERMISSIONS includes both `settings:manage` and `settings:view`

#### Scenario: Secretary has view-only
- GIVEN role=SECRETARY → THEN ROLE_PERMISSIONS includes `settings:view`, NOT `settings:manage`

#### Scenario: Professional has no settings access
- GIVEN role=PROFESSIONAL → THEN ROLE_PERMISSIONS includes neither `settings:manage` nor `settings:view`

#### Scenario: Patient has no settings access
- GIVEN role=PATIENT → THEN ROLE_PERMISSIONS includes neither `settings:manage` nor `settings:view`

### Requirement: Settings Permission Type
The system MUST extend the `PermissionKey` union type to include the literal strings `"settings:manage"` and `"settings:view"`. These MUST be derivable from `ROLE_PERMISSIONS` via `(typeof ROLE_PERMISSIONS)[UserRoleType][number]`.

#### Scenario: PermissionKey includes settings
- GIVEN `ROLE_PERMISSIONS` includes `settings:manage`
- THEN `PermissionKey` union type includes `"settings:manage"`

#### Scenario: Type-level exhaustiveness
- GIVEN a function accepting `PermissionKey`
- WHEN passing `"settings:view"` → THEN type-checker accepts without error
