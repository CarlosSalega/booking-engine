# Tasks: Auth Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1000-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Tracker = `feature/auth-module`. PR #1 base = tracker. PR #2 base = PR #1 branch. PR #3 base = PR #2 branch. Tracker stays draft/no-merge; only the final integrated branch lands on `main`.

### Suggested Work Units

| Unit | PR | Base | Scope |
|------|----|------|-------|
| 1 | PR 1 | `feature/auth-module` | Prisma, core/auth/, roles, types, constants, module barrel, role tests |
| 2 | PR 2 | PR 1 branch | Schemas, 4 actions, barrels, schema tests |
| 3 | PR 3 | PR 2 branch | Pages, API route, proxy.ts, hooks |

## Phase 1: Foundation (PR 1 — base: `feature/auth-module`)

- [x] 1.1 Create `src/lib/prisma.ts` — singleton Prisma client (design prerequisite, missing today).
- [x] 1.2 Modify `prisma/schema.prisma` — add `User`, `Session`, `Account`, `Verification` per Better Auth adapter.
- [x] 1.3 Run `npx prisma generate` — no schema errors.
- [x] 1.4 Create `src/core/auth/auth-instance.ts` — `betterAuth({...})` with `prismaAdapter`, email+password, `role` additionalField, `databaseHooks.session.create.before` reading `SESSION_DURATION[role]`.
- [x] 1.5 Create `src/core/auth/auth-client.ts` — re-export `createAuthClient` from `better-auth/react`.
- [x] 1.6 Create `src/core/auth/auth-proxy.ts` — `authProxy(request)` returns `NextResponse.redirect(/login)` or `NextResponse.next()` per `auth.api.getSession()`.
- [x] 1.7 Create `src/core/auth/index.ts` — barrel for `auth`, `createAuthClient`, `authProxy`.
- [x] 1.8 Create `src/modules/auth/domain/roles.ts` + barrel — `USER_ROLE`, `UserRoleType`, `ROLE_PERMISSIONS`, `SESSION_DURATION` (ADMIN 28800, PROFESSIONAL 86400, PATIENT 2592000, SECRETARY 28800).
- [x] 1.9 Create `src/modules/auth/types/auth.types.ts` + barrel — `AuthResult<T>`, `LoginInput`, `RegisterInput`.
- [x] 1.10 Create `src/modules/auth/constants/index.ts` — re-export `SESSION_DURATION`, `USER_ROLE`.
- [x] 1.11 Create `src/modules/auth/index.ts` — module barrel re-exporting domain, types, constants.
- [x] 1.12 Create `src/modules/auth/domain/__tests__/roles.test.ts` — 4 roles, durations, permission keys.
- [x] 1.13 Verify: `pnpm test roles.test` green, `pnpm type-check` clean.

## Phase 2: Validation + Actions (PR 2 — base: PR 1 branch)

- [x] 2.1 Create `src/modules/auth/schemas/auth.schema.ts` + barrel — `registerSchema` (name 1-100, email, password ≥ 8, role default PATIENT), `loginSchema`, `resetPasswordSchema`.
- [x] 2.2 Create `src/modules/auth/actions/login.action.ts` — Zod parse → `auth.api.signInEmail` → `AuthResult<Session>`.
- [x] 2.3 Create `src/modules/auth/actions/register.action.ts` — Zod parse → duplicate-email check → `auth.api.signUpEmail({ role: PATIENT })` → `AuthResult<User>`.
- [x] 2.4 Create `src/modules/auth/actions/logout.action.ts` — `auth.api.signOut` invalidates session.
- [x] 2.5 Create `src/modules/auth/actions/reset-password.action.ts` — Zod parse → `auth.api.requestPasswordReset`.
- [x] 2.6 Create `src/modules/auth/actions/index.ts` — barrel.
- [x] 2.7 Update `src/modules/auth/index.ts` — also re-export `actions` and `schemas`.
- [x] 2.8 Create `src/modules/auth/domain/__tests__/auth.schema.test.ts` — valid + invalid + boundary cases per spec.
- [x] 2.9 Verify: `pnpm test` green, `pnpm type-check` clean.

## Phase 3: UI + Routing (PR 3 — base: PR 2 branch)

- [x] 3.1 Create `src/app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)` from `better-auth/next-js` exposing `GET, POST` (Next.js 16 App Router pattern, resolves design open question).
- [x] 3.2 Create `src/app/proxy.ts` — Next.js 16 proxy wiring `authProxy` with `config.matcher` narrowing to private routes.
- [x] 3.3 Create `src/modules/auth/hooks/use-session.ts` — re-export `authClient.useSession`.
- [x] 3.4 Create `src/modules/auth/hooks/use-auth.ts` — wraps `signIn.email`, `signUp.email`, `signOut`.
- [x] 3.5 Create `src/modules/auth/hooks/index.ts` — barrel.
- [x] 3.6 Create `src/app/(auth)/login/page.tsx` — form + `useActionState(login)`, redirect `/` if session exists.
- [x] 3.7 Create `src/app/(auth)/register/page.tsx` — form + `useActionState(register)`, role hidden, redirect `/` if session exists.
- [x] 3.8 Update `src/modules/auth/index.ts` — also re-export `hooks`.
- [x] 3.9 Verify: `pnpm build` succeeds, `pnpm type-check` clean.
