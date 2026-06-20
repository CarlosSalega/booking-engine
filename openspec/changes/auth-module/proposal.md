# Proposal: Auth Module

## Intent

The application has no authentication system. Better Auth v1.6.19 and its Prisma adapter are installed but unconfigured — the Prisma schema has no User/Session/Account models, and no auth instance, middleware, or pages exist. This change introduces the complete auth foundation: identity, sessions, route protection, and role-aware registration.

## Scope

### In Scope

- Better Auth instance with Prisma adapter (`src/core/auth/`)
- Auth feature module with domain roles, registration, login, logout, password reset (`src/modules/auth/`)
- Prisma models: User, Session, Account, Verification
- Pages: `/login`, `/register` (public registration locked to PATIENT role)
- Route protection middleware via Next.js middleware
- Server Actions for login, register, logout, reset-password
- Configurable session duration per role (ADMIN 8h, PROFESSIONAL 24h, PATIENT 30d)
- Client-side auth hooks (`useSession`, `useAuth`)

### Out of Scope

- OAuth / magic links / MFA (future)
- Email verification (deferred post-MVP)
- Admin user creation UI (ADMIN/SECRETARY/PROFESSIONAL created via dashboard later)
- Rate limiting (future middleware)
- RBAC permission guards on specific routes (roles defined here, enforcement in later changes)

## Capabilities

### New Capabilities

- `auth-core`: Better Auth singleton instance, Prisma adapter config, auth client for components, session verification utilities
- `auth-module`: Auth feature module — domain roles/permissions, registration/login/logout/reset-password use cases, Server Actions, presentation pages, Zod schemas, client hooks

### Modified Capabilities

None

## Approach

Split architecture per project conventions:
- **`src/core/auth/`** — cross-cutting infrastructure (like `core/database/`). Contains the Better Auth instance singleton, client export, and middleware helper.
- **`src/modules/auth/`** — feature module following standard structure (domain/, application/, infrastructure/, presentation/, actions/, schemas/, types/, constants/, hooks/).

Domain layer defines role constants (`USER_ROLE`), permission maps, and session duration config — pure business logic with no framework dependencies. Infrastructure layer wraps Better Auth calls and Prisma user queries. Server Actions orchestrate: validate (Zod 4) → call use case → return typed result.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add User, Session, Account, Verification models |
| `src/core/auth/` | New | Better Auth instance, client, middleware helper |
| `src/modules/auth/` | New | Full feature module (8 subdirectories + barrel) |
| `src/app/(auth)/login/page.tsx` | New | Login page |
| `src/app/(auth)/register/page.tsx` | New | Registration page (PATIENT only) |
| `src/app/api/auth/[...all]/route.ts` | New | Better Auth HTTP handler |
| `src/middleware.ts` | New | Route protection (redirect to /login) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Better Auth Prisma adapter schema mismatch | Low | Follow adapter docs exactly; validate with `prisma generate` |
| Middleware runs on every request (perf) | Low | Narrow matcher to private routes only |
| Session duration per role not natively supported | Med | Configure via Better Auth `session.expiresIn` callback or per-session override |

## Rollback Plan

Remove `src/core/auth/`, `src/modules/auth/`, auth routes, middleware, and Prisma models. Run `prisma migrate dev` to revert schema. No existing features depend on auth, so rollback is clean with zero data migration.

## Dependencies

- Better Auth v1.6.19 + @better-auth/prisma-adapter v1.6.19 (installed)
- Prisma (configured)
- Zod 4 (installed)

## Success Criteria

- [ ] User can register as PATIENT at `/register`
- [ ] User can login with email/password at `/login`
- [ ] Unauthenticated access to private routes redirects to `/login`
- [ ] Logout invalidates session and redirects to `/login`
- [ ] Password reset flow works end-to-end
- [ ] Session duration respects per-role configuration
- [ ] `prisma generate` succeeds with new models
