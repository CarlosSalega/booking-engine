# Auth Module Specification

## Purpose
Authentication feature module: domain roles/permissions, Zod 4 validation schemas, Server Actions (register/login/logout/reset-password), presentation pages, and client auth hooks. Enforces: unique email, password ≥ 8 chars, public registration locked to PATIENT.

## Requirements

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

Both pages MUST expose exactly one `<h1>` element. The page heading ("Bienvenido de nuevo" for login, "Creá tu cuenta" for register) SHALL be the single `<h1>`. The branding wordmark MUST be rendered as a non-heading element (e.g. `<p>` or `<span>`) with equivalent visual styling.

Both pages MUST provide programmatic error association for form validation:

- Each form input MUST have `aria-invalid="true"` when the field has a validation error, and `aria-invalid` MUST be absent or `"false"` when valid.
- Each form input MUST have `aria-describedby` referencing the `id` of its associated error element (and hint element, if present).
- Each error element MUST have a stable, unique `id` and `role="alert"` so screen readers announce it immediately.
- Duplicate per-field error nodes MUST NOT be rendered. Each field has at most one error element.
- On failed form submission, focus MUST move to the first invalid field. If the error is a single form-level message (e.g. "Invalid credentials" on login), focus MUST move to the form-level alert region.
- `noValidate` MUST remain on the form element (custom programmatic validation; native browser validation stays disabled).

Both pages MUST provide a password visibility toggle on the password input:

- The toggle MUST be a `<button>` with `aria-pressed` reflecting the current visibility state (`"true"` when password is visible, `"false"` when hidden).
- The toggle MUST have an `aria-label` in Spanish: "Mostrar contraseña" when password is hidden, "Ocultar contraseña" when visible.
- The toggle MUST be keyboard-reachable (in tab order, activatable with Enter/Space).
- The toggle MUST NOT cause layout shift when toggled.

All form inputs on both pages MUST use iOS-safe sizing to prevent auto-zoom:

- Input text size MUST be `text-base md:text-sm` (16px on mobile to prevent iOS zoom, smaller on desktop).
- Control height MUST follow the project convention established in `service-form.tsx`.
- Template-literal class conditionals in the touched files MUST be replaced with `cn()`.

(Previously: Presentation Pages required `/login` and `/register` as public pages with authenticated redirect, but had no accessibility obligations for heading structure, error association, input sizing, or password toggle.)

#### Scenario: Unauthenticated access
- GIVEN no session → WHEN navigating to `/login` or `/register` → THEN form is displayed

#### Scenario: Authenticated redirect
- GIVEN active session → WHEN navigating to `/login` or `/register` → THEN redirects to `/`

#### Scenario: Single h1 on login page
- GIVEN the `/login` page renders
- WHEN querying the DOM for `h1` elements
- THEN exactly one `<h1>` is present containing "Bienvenido de nuevo"
- AND the branding wordmark is not a heading element

#### Scenario: Single h1 on register page
- GIVEN the `/register` page renders
- WHEN querying the DOM for `h1` elements
- THEN exactly one `<h1>` is present containing "Creá tu cuenta"
- AND the branding wordmark is not a heading element

#### Scenario: Error association on failed login
- GIVEN the user submits `/login` with an invalid email format
- WHEN the form processes the submission
- THEN the email input has `aria-invalid="true"`
- AND the email input has `aria-describedby` pointing to the error element's `id`
- AND the error element has `role="alert"`
- AND focus is on the first invalid field

#### Scenario: Error association on failed register
- GIVEN the user submits `/register` with a password shorter than 8 characters
- WHEN the form processes the submission
- THEN the password input has `aria-invalid="true"`
- AND the password input has `aria-describedby` pointing to the error element's `id`
- AND the error element has `role="alert"`
- AND no duplicate error nodes exist for the same field

#### Scenario: Form-level error focus on credential failure
- GIVEN the user submits `/login` with valid format but wrong credentials
- WHEN the server returns "Invalid credentials"
- THEN focus moves to the form-level alert region with `role="alert"`

#### Scenario: noValidate preserved
- GIVEN either auth form renders
- WHEN inspecting the `<form>` element
- THEN the `novalidate` attribute is present

#### Scenario: Password toggle state accuracy
- GIVEN the password field on `/login` or `/register`
- WHEN the toggle button is clicked
- THEN `aria-pressed` changes from `"false"` to `"true"`
- AND `aria-label` changes from "Mostrar contraseña" to "Ocultar contraseña"
- AND the password input type changes from `"password"` to `"text"`

#### Scenario: Password toggle keyboard accessible
- GIVEN focus is on the password toggle button
- WHEN the user presses Enter or Space
- THEN the password visibility toggles

#### Scenario: iOS-safe input sizing
- GIVEN the `/login` or `/register` page renders on a mobile viewport
- WHEN inspecting the input elements' computed font size
- THEN the font size is at least 16px (`text-base`) preventing iOS auto-zoom

#### Scenario: Input sizing on desktop
- GIVEN the `/login` or `/register` page renders on a viewport ≥768px
- WHEN inspecting the input elements
- THEN the font size follows `md:text-sm` (smaller desktop size)
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
