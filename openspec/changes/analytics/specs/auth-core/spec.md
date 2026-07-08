# Delta for Auth Core

## ADDED Requirements

### Requirement: Analytics Permission (AUTH-016)

The system MUST add `analytics:view` to the `ROLE_PERMISSIONS` RBAC map:

| Permission | ADMIN | SECRETARY | PROFESSIONAL | PATIENT |
|------------|-------|-----------|--------------|---------|
| `analytics:view` | ✓ | ✓ | ✓ | — |

- `analytics:view` SHALL grant access to the analytics dashboard at `/dashboard/analytics`.
- ADMIN and SECRETARY roles SHALL see full organization-wide analytics with optional professional filter.
- PROFESSIONAL role SHALL see only their own metrics (auto-scoped by action-level role resolution).
- PATIENT role SHALL be blocked from analytics route and actions.
- The `PermissionKey` union type MUST include `"analytics:view"` (derived from `ROLE_PERMISSIONS`).

#### Scenario: Admin has analytics permission
- GIVEN role=ADMIN → THEN `ROLE_PERMISSIONS` includes `analytics:view`

#### Scenario: Secretary has analytics permission
- GIVEN role=SECRETARY → THEN `ROLE_PERMISSIONS` includes `analytics:view`

#### Scenario: Professional has analytics permission
- GIVEN role=PROFESSIONAL → THEN `ROLE_PERMISSIONS` includes `analytics:view`

#### Scenario: Patient has no analytics access
- GIVEN role=PATIENT → THEN `ROLE_PERMISSIONS` does NOT include `analytics:view`

#### Scenario: PermissionKey type includes analytics
- GIVEN `ROLE_PERMISSIONS` includes `analytics:view` → THEN `PermissionKey` union type includes `"analytics:view"` (type-level check)
