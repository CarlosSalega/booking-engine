# Auth Core Specification

## Purpose
Cross-cutting authentication infrastructure: Better Auth instance with Prisma adapter, typed auth client, session verification, and Next.js middleware helper. No business logic or UI.

## Requirements

### Requirement: Better Auth Instance
The system MUST export a configured Better Auth singleton (`auth`) using the Prisma adapter with models: `user`, `session`, `account`, `verification`.

#### Scenario: Instance creation
- GIVEN Prisma client and Better Auth with Prisma adapter
- WHEN `auth()` is invoked
- THEN returns configured Better Auth instance

#### Scenario: Adapter schema match
- GIVEN Prisma schema includes User, Session, Account, Verification models
- WHEN `prisma generate` runs
- THEN adapter resolves all model references without error

### Requirement: Auth Client Exports
The system MUST export `auth.client` for Server Components and `createAuthClient` for Client Components.

#### Scenario: Server-side session access
- GIVEN a Server Component
- WHEN calling `auth.api.getSession({ headers })`
- THEN returns session object or null

#### Scenario: Client-side session access
- GIVEN a Client Component using `createAuthClient()`
- WHEN calling `authClient.getSession()`
- THEN returns session or null from httpOnly cookie

### Requirement: getSession Utility
The system MUST export `getSession(request: Request): Promise<Session | null>` that verifies the auth cookie and returns the session or null.

#### Scenario: Valid session
- GIVEN request with valid auth cookie
- WHEN `getSession(request)` is called
- THEN returns session with user data

#### Scenario: No cookie
- GIVEN request without auth cookie
- WHEN `getSession(request)` is called
- THEN returns null

#### Scenario: Expired session
- GIVEN request with expired auth cookie
- WHEN `getSession(request)` is called
- THEN returns null

### Requirement: Middleware Helper
The system MUST export `authMiddleware` compatible with Next.js middleware that redirects unauthenticated requests to `/login`.

#### Scenario: Authenticated request passes
- GIVEN request with valid session
- WHEN middleware processes it
- THEN request passes through unchanged

#### Scenario: Unauthenticated request blocked
- GIVEN request without valid session
- WHEN middleware processes it
- THEN redirects to `/login`

#### Scenario: Public route bypass
- GIVEN request to `/login`, `/register`, or `/api/auth/*`
- WHEN middleware processes it
- THEN request passes through without redirect

### Requirement: Session Duration Support
The system MUST accept configurable session duration from the domain layer, supporting different expiration per role.

#### Scenario: Custom duration applied
- GIVEN session duration config of 28800 seconds (8h)
- WHEN session is created
- THEN session expires in 28800 seconds

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
