# Delta for Auth Core

## ADDED Requirements

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
