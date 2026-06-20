# Exploration: auth-module

## Current State

### What exists
- **4 domain-only modules**: `bookings`, `patients`, `professionals`, `services` — each with `domain/` containing pure TypeScript types, const objects, Zod 4 schemas, barrel exports, and tests.
- **Prisma schema**: Empty — only `generator client` and `datasource db` (PostgreSQL). No models.
- **No auth infrastructure**: No `middleware.ts`, no auth pages/routes, no `src/core/` directory, no Better Auth instance.
- **Dependencies already installed**: `better-auth@1.6.19`, `@better-auth/prisma-adapter@1.6.19`, `@prisma/client@7.8.0`, `zod@4.4.3`.
- **Test infra**: Vitest 4.1.9, jsdom, testing-library, `@/` path alias.
- **App router**: Bare `layout.tsx` (Inter + JetBrains Mono fonts) and `page.tsx` ("Hello, World!").

### What does NOT exist
- No `src/modules/auth/` directory
- No `src/core/auth/` directory
- No User/Session/Account Prisma models
- No Next.js middleware for route protection
- No API route for Better Auth (`/api/auth/[...all]`)
- No login/register pages

---

## Affected Areas

| Path | Why |
|------|-----|
| `prisma/schema.prisma` | Needs User, Session, Account, Verification models for Better Auth Prisma adapter |
| `src/modules/auth/` | New module — domain, infrastructure, presentation, actions |
| `src/core/auth/` | Better Auth instance singleton consumed by all modules |
| `src/middleware.ts` | Route protection — verify session, redirect to login |
| `src/app/api/auth/[...all]/route.ts` | Better Auth HTTP handler |
| `src/app/(auth)/login/` | Login page |
| `src/app/(auth)/register/` | Register page |
| `docs/SECURITY.md` | Still references Clerk — must be updated to Better Auth |

---

## Approaches

### 1. Split: `core/auth` (instance) + `modules/auth` (feature)

Better Auth instance lives in `src/core/auth/` as cross-cutting infrastructure. The `src/modules/auth/` module owns the feature: login/register UI, server actions, role domain logic, authorization helpers.

```
src/
├── core/
│   └── auth/
│       ├── auth-instance.ts    ← betterAuth() config + Prisma adapter
│       ├── auth-client.ts      ← createAuthClient() for client components
│       └── index.ts
├── modules/
│   └── auth/
│       ├── domain/
│       │   ├── role.ts         ← UserRole const object + type
│       │   ├── user.ts         ← User type, rules
│       │   ├── user.schema.ts  ← Zod schemas
│       │   ├── permissions.ts  ← Role-permission mapping
│       │   └── index.ts
│       ├── infrastructure/
│       │   └── user.repository.ts
│       ├── presentation/
│       │   ├── login-form.tsx
│       │   └── register-form.tsx
│       ├── actions/
│       │   ├── login.action.ts
│       │   ├── register.action.ts
│       │   └── logout.action.ts
│       ├── hooks/
│       │   └── use-session.ts
│       └── index.ts
├── middleware.ts               ← Session check via Better Auth
└── app/
    ├── api/auth/[...all]/route.ts
    └── (auth)/login/ & /register/
```

- **Pros**: Clean separation — core provides the auth primitive, module provides the feature. Matches MODULES.md which lists both `core/auth/` and `modules/auth/`. Other modules import `core/auth` for session checks without depending on `modules/auth`.
- **Cons**: Two directories for auth concerns. Requires clear documentation of what goes where.
- **Effort**: Medium

### 2. Unified: Everything in `modules/auth/`

Better Auth instance, role domain, UI, actions — all inside `src/modules/auth/`.

```
src/modules/auth/
├── domain/         ← roles, user types, permissions
├── infrastructure/ ← Better Auth instance, Prisma adapter, repository
├── presentation/   ← login/register forms
├── actions/        ← server actions
└── index.ts
```

- **Pros**: Single module, high cohesion. Simpler mental model.
- **Cons**: Other modules importing auth must reach into `modules/auth/` for the auth instance. The auth instance is cross-cutting (used by middleware, every action, every server component) — putting it in a feature module creates a dependency inversion problem.
- **Effort**: Low

### 3. Core-only: Everything in `core/auth/`

No `modules/auth/` at all. Auth instance, role domain, UI, actions all live in `core/auth/`.

- **Pros**: Auth as infrastructure, not a feature.
- **Cons**: Violates MODULES.md which explicitly lists `auth` as a module. Mixes domain logic (roles, permissions) with infrastructure. Doesn't follow the feature-module pattern.
- **Effort**: Low

---

## Recommendation

**Approach 1: Split `core/auth` + `modules/auth`**

This is the only approach that respects the existing architecture docs:

1. **MODULES.md** explicitly lists both `core/auth/` (cross-cutting: auth provider, RBAC) and `modules/auth/` (feature: authentication, authorization, roles, permissions, session).
2. **Dependency direction**: Other modules (bookings, patients, etc.) need to check "is this user authorized?" — they should import from `core/auth`, not from a sibling feature module. This avoids circular or sideways dependencies.
3. **Better Auth instance** is infrastructure (like Prisma client) — it belongs in `core/`.
4. **Role domain logic** (what roles exist, what permissions each role has) is pure business rules — belongs in `modules/auth/domain/`.
5. **Auth UI and actions** (login form, register form, logout) are feature concerns — belong in `modules/auth/`.

### Prisma Schema Requirements

Better Auth Prisma adapter needs these models:
- **User**: id, name, email, emailVerified, image, createdAt, updatedAt + custom `role` field
- **Session**: id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId
- **Account**: id, accountId, providerId, userId, accessToken, refreshToken, etc.
- **Verification**: id, identifier, value, expiresAt, createdAt, updatedAt

The `role` field on User must be added as a custom field. Better Auth supports extending the user schema via `user.additionalFields` in the auth config.

### Key Decisions Needed

1. **Role field type**: String column with const object values (`ADMIN`, `SECRETARY`, `PROFESSIONAL`, `PATIENT`). Follow convention: const object, not TypeScript enum.
2. **RBAC implementation**: Better Auth has an `access` plugin, but the feature doc says "Better Auth solo entrega identidad" and role logic belongs to domain. Recommendation: use Better Auth for identity, implement custom RBAC in `modules/auth/domain/permissions.ts`.
3. **Email verification**: Feature doc marks it as "opcional MVP". Recommendation: defer to keep scope tight.
4. **Password reset**: Included in scope. Better Auth supports it via the `emailAndPassword` config + Verification model.

---

## Risks

| Risk | Mitigation |
|------|------------|
| **SECURITY.md references Clerk** | Must update to Better Auth before implementation. Stale docs will confuse future agents. |
| **Better Auth schema drift** | The Prisma adapter expects exact model shapes. Use `npx auth generate` or copy from verified docs. Test with `prisma validate` immediately. |
| **Custom `role` field integration** | Better Auth's `user.additionalFields` must match Prisma schema. Misalignment causes runtime errors. |
| **No `src/core/` exists yet** | First module to use `core/` — sets precedent. Must establish clear conventions for what belongs in core vs modules. |
| **Prisma schema is empty** | First migration will create ALL tables. Need to coordinate with future domain modules that also need Prisma models. |
| **Better Auth v1.6.19 is very recent** | API surface may differ from docs. Verify against installed package types before committing to patterns. |

---

## Ready for Proposal

**Yes.** The requirements are clear from `docs/features/01-AUTHENTICATION.md`, the architecture is well-defined, dependencies are installed, and the module structure follows established patterns from the 4 existing domain modules.

The orchestrator should proceed to `sdd-propose` with Approach 1 (split `core/auth` + `modules/auth`). The proposal should address:
- Prisma schema additions (User with role, Session, Account, Verification)
- Better Auth instance in `src/core/auth/`
- Module structure for `src/modules/auth/`
- Middleware for route protection
- API route handler
- Login/Register pages
- Updating SECURITY.md to replace Clerk references
