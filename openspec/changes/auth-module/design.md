# Design: Auth Module

## Technical Approach

Split architecture per project conventions: `src/core/auth/` (cross-cutting Better Auth singleton, Prisma adapter, client exports, proxy helper) + `src/modules/auth/` (feature module — domain constants/schemas, Server Actions, hooks, presentation pages). Auth pages live in `src/app/(auth)/` with a thin proxy at `src/app/proxy.ts` for route protection. Better Auth HTTP handler at `src/app/api/auth/[...all]/route.ts`.

## Architecture Decisions

### Decision: Better Auth Instance

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Module-level `const auth` | Simple, cached at import | ✅ **Chosen** |
| Lazy function `getAuth()` | Supports hot-reload edge cases | Overkill for our adapter setup |

**Rationale**: Better Auth `betterAuth()` returns a configured singleton — no reason to defer creation. Place in `src/core/auth/auth-instance.ts` with `additionalFields: { user: { role: { type: "string", required: true } } }` to add the `role` field to User.

### Decision: Session Duration Per Role

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `databaseHooks.session.create.before` | Reads user role on every session create | ✅ **Chosen** |
| Custom plugin | Complex, ties us to internal API | Rejected |
| Single `expiresIn` for all | Doesn't meet spec requirement | Rejected |

**Rationale**: Better Auth `session.expiresIn` is a single `number`, not a callback. The `before` hook receives the session-to-create, lets us query the user's role from the adapter, compute `expiresAt = Date.now() + SESSION_DURATION[role] * 1000`, and return the modified session. One extra DB read per sign-in — acceptable.

### Decision: Proxy vs Middleware

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `proxy.ts` (Next.js 16) | Current platform pattern | ✅ **Chosen** |
| `middleware.ts` (legacy) | Deprecated in Next.js 16 | Rejected |

**Rationale**: Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`. The proxy interceptor pattern is the blessed replacement. Export from `src/core/auth/auth-proxy.ts` a helper that checks the auth cookie via `auth.api.getSession()` and either passes through or redirects to `/login`. Public routes (matcher: `/login`, `/register`, `/api/auth/*`, `/_next/*`, `/favicon.ico`) pass through without check.

### Decision: Client Auth Hooks

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Thin wrapper over `createAuthClient` | Direct access to Better Auth client API | ✅ **Chosen** |
| Custom React context | Duplicates Better Auth's built-in reactivity | Rejected |

**Rationale**: `createAuthClient()` from `better-auth/client/react` already provides `useSession()`, `signIn`, `signUp`, `signOut`. `useSession` = re-export of `authClient.useSession`. `useAuth` = wraps `signIn.email(email, password)`, `signUp.email({...})`, `signOut()` for ergonomic one-hook API. AuthProvider is NOT needed — Better Auth client uses nanostores internally.

### Decision: Server Actions

**Choice**: Each action validates input with Zod 4, calls Better Auth API, returns typed `{ success, data } | { error }`.  
**Rationale**: Follows project pattern: validate → call use case → typed result. Better Auth handles hashing, session creation, cookie setting. Actions are thin orchestrators.

## Data Flow

```
Browser ──→ proxy.ts ──→ [session?] ──→ Page
                 │           │ no
                 │           └→ redirect /login
                 │
           /api/auth/* ──→ Better Auth handler ──→ Prisma adapter ──→ DB

Login flow:
  login.action.ts ──→ Zod parse ──→ auth.api.signInEmail() ──→ Set cookie ──→ Redirect /
Register flow:
  register.action.ts ──→ Zod parse ──→ auth.api.signUpEmail({ role: PATIENT }) ──→ Set cookie ──→ Redirect /
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add User, Session, Account, Verification models with Better Auth-compatible fields |
| `src/core/auth/auth-instance.ts` | Create | Better Auth singleton with Prisma adapter + `role` additionalField |
| `src/core/auth/auth-client.ts` | Create | Exports `createAuthClient` for client components |
| `src/core/auth/auth-proxy.ts` | Create | `authProxy` helper for proxy.ts — session check + redirect |
| `src/core/auth/index.ts` | Create | Barrel: re-exports instance, client, proxy helper, getSession |
| `src/app/api/auth/[...all]/route.ts` | Create | Better Auth HTTP handler — `auth.handler()` |
| `src/app/proxy.ts` | Create | Next.js 16 proxy — wires `authProxy` with matcher |
| `src/modules/auth/domain/roles.ts` | Create | `USER_ROLE`, `UserRoleType`, `ROLE_PERMISSIONS`, `SESSION_DURATION` |
| `src/modules/auth/domain/index.ts` | Create | Barrel |
| `src/modules/auth/schemas/auth.schema.ts` | Create | `registerSchema`, `loginSchema`, `resetPasswordSchema` (Zod 4) |
| `src/modules/auth/schemas/index.ts` | Create | Barrel |
| `src/modules/auth/actions/login.action.ts` | Create | `login` Server Action |
| `src/modules/auth/actions/register.action.ts` | Create | `register` Server Action |
| `src/modules/auth/actions/logout.action.ts` | Create | `logout` Server Action |
| `src/modules/auth/actions/reset-password.action.ts` | Create | `resetPassword` Server Action |
| `src/modules/auth/actions/index.ts` | Create | Barrel |
| `src/modules/auth/hooks/use-session.ts` | Create | `useSession` — wraps `authClient.useSession()` |
| `src/modules/auth/hooks/use-auth.ts` | Create | `useAuth` — wraps `signIn`, `signUp`, `signOut` |
| `src/modules/auth/hooks/index.ts` | Create | Barrel |
| `src/modules/auth/types/auth.types.ts` | Create | `AuthResult`, `LoginInput`, `RegisterInput`, inferred types |
| `src/modules/auth/types/index.ts` | Create | Barrel |
| `src/modules/auth/constants/index.ts` | Create | Re-exports domain role constants |
| `src/modules/auth/index.ts` | Create | Module barrel: re-exports domain, schemas, actions, hooks, types |
| `src/app/(auth)/login/page.tsx` | Create | Login page — form + `useActionState` + redirect if authenticated |
| `src/app/(auth)/register/page.tsx` | Create | Register page — form + `useActionState`, role locked to PATIENT |
| `src/modules/auth/domain/__tests__/roles.test.ts` | Create | Unit tests for roles and session duration config |
| `src/modules/auth/domain/__tests__/auth.schema.test.ts` | Create | Unit tests for Zod schemas (valid/invalid/edge cases) |

**Total**: 26 files (4 core, 3 app, 16 module, 3 tests). No deletes.

## Interfaces / Contracts

```typescript
// src/core/auth/auth-instance.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { SESSION_DURATION, USER_ROLE } from "@/modules/auth/domain";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: { additionalFields: { role: { type: "string", required: true } } },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId } });
          if (!user?.role) return;
          const duration = SESSION_DURATION[user.role as keyof typeof SESSION_DURATION];
          return { data: { ...session, expiresAt: new Date(Date.now() + duration * 1000) } };
        },
      },
    },
  },
});

// src/modules/auth/types/auth.types.ts — return types
type AuthSuccess<T = void> = { success: true; data: T };
type AuthError = { success: false; error: string };
type AuthResult<T = void> = AuthSuccess<T> | AuthError;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `USER_ROLE`, `SESSION_DURATION`, Zod schemas | Vitest, `safeParse`, no DB/mocks needed |
| Unit | Proxy matcher logic (public vs private routes) | Pure function tests |
| Integration | Server Actions end-to-end | Vitest + `auth.api` with test DB |
| E2E | Login/register/logout flows | Playwright (future) |

## Migration

No migration required. Prisma schema is empty — first `prisma migrate dev` creates the auth tables. No existing data to migrate.

## Open Questions

- [ ] Should `src/app/api/auth/[...all]/route.ts` use `auth.handler()` directly or wrap in error catcher?
- [ ] Confirm `databaseHooks.session.create.before` fires before `expiresAt` is set so our override takes effect (testing will validate)
