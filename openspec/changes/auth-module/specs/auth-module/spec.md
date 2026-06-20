# Delta for Auth Module

## ADDED Requirements

### Requirement: Domain Constants
The system MUST export `USER_ROLE` const object (ADMIN, SECRETARY, PROFESSIONAL, PATIENT), `UserRoleType`, `ROLE_PERMISSIONS` map, and `SESSION_DURATION` per role in seconds: ADMIN 28800, PROFESSIONAL 86400, PATIENT 2592000, SECRETARY 28800. No TypeScript enums.

#### Scenario: All roles defined
- GIVEN USER_ROLE object → THEN all four string constants are present

#### Scenario: Session duration per role
- GIVEN ADMIN user → THEN session duration is 28800s (8h)
- GIVEN PATIENT user → THEN session duration is 2592000s (30d)

### Requirement: Validation Schemas
The system MUST export Zod 4 schemas:
- `registerSchema`: `name` (1-100 chars), `email` (email format), `password` (≥ 8 chars). `role` defaults to PATIENT, not exposed in public form.
- `loginSchema`: `email` (email format), `password` (non-empty).
- `resetPasswordSchema`: `email` (email format).

#### Scenario: Valid registration
- GIVEN name="Ana", email="ana@test.com", password="secure123" → THEN parse succeeds, role=PATIENT

#### Scenario: Validation failures
- GIVEN password="1234567" (7 chars) → THEN fails ("min 8 characters")
- GIVEN email="notanemail" → THEN fails ("Invalid email")
- GIVEN name="" → THEN fails ("Name required")

#### Scenario: Valid login and reset
- GIVEN email="user@test.com", password="secure123" → THEN loginSchema parses successfully
- GIVEN email="user@test.com" → THEN resetPasswordSchema parses successfully

### Requirement: Server Actions
The system MUST export `login`, `register`, `logout`, `resetPassword` Server Actions. Each validates input with Zod 4 before calling the use case, returning typed results. `register` MUST create user as PATIENT and reject duplicate emails. `logout` MUST invalidate the current session.

#### Scenario: Login
- GIVEN valid credentials → THEN returns success with session
- GIVEN invalid credentials → THEN returns error "Invalid credentials"

#### Scenario: Register
- GIVEN unique email, valid name, password ≥ 8 chars → THEN creates PATIENT user, establishes session
- GIVEN email "dup@test.com" already registered → THEN returns error "Email already registered"

#### Scenario: Logout and reset
- GIVEN active session → WHEN `logout()` → THEN session is invalidated
- GIVEN registered email → WHEN `resetPassword({ email })` → THEN initiates password reset

### Requirement: Presentation Pages
The system MUST provide `/login` and `/register` as public pages. `/register` MUST restrict role to PATIENT (hidden from form). Both pages MUST redirect authenticated users to `/`.

#### Scenario: Unauthenticated access
- GIVEN no session → WHEN navigating to `/login` or `/register` → THEN form is displayed

#### Scenario: Authenticated redirect
- GIVEN active session → WHEN navigating to `/login` or `/register` → THEN redirects to `/`

### Requirement: Client Hooks
The system MUST export `useSession()` and `useAuth()` using Better Auth's client SDK.

#### Scenario: Session state
- GIVEN authenticated user → THEN `useSession()` returns session data, isPending=false
- GIVEN unauthenticated → THEN `useSession()` returns null, isPending=false

#### Scenario: Auth actions
- GIVEN `useAuth()` hook → THEN exposes `login`, `register`, `logout` methods

### Requirement: Route Protection
All private routes MUST require active session. The system SHALL use `authMiddleware` (from auth-core) to redirect unauthenticated requests to `/login`.

#### Scenario: Protected routes
- GIVEN no session → WHEN accessing private route → THEN redirects to `/login`
- GIVEN valid session → WHEN accessing private route → THEN renders normally

### Requirement: Barrel Export
The system MUST export an `index.ts` barrel re-exporting all public symbols from domain/, schemas/, actions/, hooks/, and types/ subdirectories.

#### Scenario: All public symbols accessible
- GIVEN `import { ... } from "@/modules/auth"`
- THEN all USER_ROLE, schemas, actions, hooks, and types are importable from a single entry point
