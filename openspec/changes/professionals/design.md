# Design: Professionals Module

## Technical Approach

Rebuild the professionals module mirroring the `services` skeleton (domain → data → actions → presentation) and the `patients` split-write pattern. Align the domain schema to Prisma `Professional` + `User`, then implement the full CRUD stack with RBAC-gated server actions. Four sequential, independently deployable PRs.

## Architecture Decisions

| Decision | Options / Tradeoffs | Chosen |
|---|---|---|
| **Domain schema**: align to Prisma `Professional` + flatten `User` on read | A) Keep stale `specialty?: string`, `avatarUrl` — wrong shape, blocks CRUD. B) Match Prisma 1:1 with `specialties: string[]`, `license`, `userId`, `email` — correct but requires rewrite. | **B** — the current schema has 5/8 fields diverging. Accept breakage; no production data exists. |
| **Data layer pattern**: pure Prisma, no React/Next.js imports | A) Single `$transaction` with manual User/Professional split. B) Separate createUser + createProfessional calls — not atomic. | **A** — matches `patients/patient-data.ts`. `createProfessional` wraps `[createUser, createProfessional]` in one `$transaction`. Read flattens `user.name`, `user.email`, `user.image` into DTO. |
| **RBAC on actions** | A) ADMIN+SECRETARY write, PROFESSIONAL read, PATIENT blocked. B) Allow PROFESSIONAL to edit own profile. | **A** — scope prohibits professional self-management. Layout blocks PATIENT; actions re-check as defense-in-depth. |
| **Specialties UI**: tag input vs comma-separated text | A) Build `TagInput` from scratch — visually clean, accessible. B) Comma-separated `<Input>` — simpler, less code. C) External lib (react-tag-input) — adds dep. | **A** — `TagInput` is a 50-line Client Component: controlled string array, Backspace removes last tag, Enter adds, duplicate prevention. Reusable across modules. |
| **Responsive strategy**: table → cards on mobile | A) shadcn/ui Table (md+) + Card stack (mobile), same as `ServiceTable`. B) Horizontal scroll on mobile — cheaper but worse UX. | **A** — proven pattern in `service-table.tsx`. No new invention needed. |
| **Status toggle**: state machine vs free transition | A) Any transition (ACTIVE↔INACTIVE) — simple, same as services. B) Guarded transitions (e.g., can't deactivate with future bookings) — safer but over-engineered for this scope. | **A** — proposal's non-goals exclude availability management. Follow `changeServiceStatus` pattern. |

## Data Flow

```
ProfessionalForm (Client) ─── Server Action ("use server") ─── Data Layer (prisma)
       │                              │                              │
       │ Zod 4 safeParse              │ Auth + RBAC                  │ $transaction
       │                              │ getOrganizationId            │   [createUser,createProfessional]
       │                              │ catch P2002/P2025            │ flatten-on-read DTO
       │                              │ revalidatePath               │
       ▼                              ▼                              ▼
   toast + router.push           {success,data}|{error}          EnrichedProfessional
```

List page flow: `searchParams` → Server Component → `parseFilters` → `getProfessionals(orgId, filters)` → `<Suspense>` → `<ProfessionalTable>` (Client). Search bar + status filter read/write URL via `router.push`.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/modules/professionals/domain/professional.ts` | Modify | Keep `ProfessionalStatus` enum, add `ProfessionalStatusType` |
| `src/modules/professionals/domain/professional.schema.ts` | Rewrite | Align to Prisma: `specialties: z.array(z.string())`, `license`, `email`, `userId`, remove `avatarUrl`/`specialty`/`fullName` |
| `src/modules/professionals/data/professional-data.ts` | Create | `getProfessionals`, `getProfessionalById`, `createProfessional`, `updateProfessional` |
| `src/modules/professionals/data/professional-data.types.ts` | Create | `EnrichedProfessional`, `CreateProfessionalInput`, `ProfessionalFilters`, `PaginatedProfessionals` |
| `src/modules/professionals/actions/professional-actions.schema.ts` | Create | Zod 4 schemas: create, update, changeStatus |
| `src/modules/professionals/actions/professional-actions.types.ts` | Create | `ProfessionalResult<T>`, inferred input types |
| `src/modules/professionals/actions/create-professional.action.ts` | Create | Zod → auth → RBAC → P2002 dedup → data layer → revalidate |
| `src/modules/professionals/actions/update-professional.action.ts` | Create | Same flow + P2025 handling |
| `src/modules/professionals/actions/change-professional-status.action.ts` | Create | Minimal: id + status, RBAC, revalidate |
| `src/modules/professionals/actions/index.ts` | Create | Barrel: re-export actions, schemas, types |
| `src/modules/professionals/presentation/formatters.ts` | Create | `getProfessionalStatusLabel`, `formatSpecialties` |
| `src/modules/professionals/index.ts` | Modify | Add data, actions, presentation barrels |
| `src/components/professionals/professional-table.tsx` | Create | Table + cards + pagination + empty state |
| `src/components/professionals/professional-form.tsx` | Create | Shared create/edit form with `TagInput` |
| `src/components/professionals/professional-detail-card.tsx` | Create | Detail view + status dropdown |
| `src/components/professionals/professional-status-badge.tsx` | Create | ACTIVE→emerald, INACTIVE→gray Badge |
| `src/components/professionals/professional-search-bar.tsx` | Create | Debounced URL-mirroring search input |
| `src/components/professionals/professional-status-filter.tsx` | Create | Select: Todos/Activo/Inactivo → URL status param |
| `src/components/professionals/tag-input.tsx` | Create | Controlled `string[]` input, Enter/Backspace, dedup |
| `src/components/professionals/professional-table-skeleton.tsx` | Create | Skeleton rows for Suspense fallback |
| `src/app/(dashboard)/dashboard/professionals/page.tsx` | Rewrite | Replace placeholder; Server Component with Suspense |
| `src/app/(dashboard)/dashboard/professionals/[id]/page.tsx` | Create | Detail page: `getProfessionalById` → notFound |
| `src/app/(dashboard)/dashboard/professionals/new/page.tsx` | Create | Create page: renders `ProfessionalForm` |
| `src/app/(dashboard)/dashboard/professionals/[id]/edit/page.tsx` | Create | Edit page: pre-fills `ProfessionalForm` |
| `src/modules/bookings/data/booking-data.ts` | Modify | Replace `ProfessionalOption` internal shape (no public API change) |
| Domain/data/action `__tests__/` | Create | TDD: schema validation, data layer queries, action guards |

## Interfaces / Contracts

```typescript
// EnrichedProfessional (flatten-on-read DTO)
interface EnrichedProfessional {
  id: string;
  organizationId: string;
  userId: string;
  fullName: string;       // from user.name
  email: string;           // from user.email
  image: string | null;    // from user.image
  specialties: string[];
  license: string | null;
  bio: string | null;
  status: ProfessionalStatusType;
  createdAt: Date;
  updatedAt: Date;
}

// Action result (discriminated union, mirrors PatientResult<T>)
type ProfessionalResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// Create input (Zod-inferred from createProfessionalSchema)
// Requires: fullName, email, status, organizationId
// Optional: specialties[], license, bio
```

**$transaction split-write pattern** (non-obvious):
```typescript
// createProfessional: wraps [createUser, createProfessional] atomically
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { name: input.fullName, email: input.email, role: "PROFESSIONAL" }
  });
  return tx.professional.create({
    data: { organizationId, userId: user.id, specialties, license, bio, status },
    include: { user: { select: { name: true, email: true, image: true } } }
  });
});
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit — domain | Schema validation (valid/invalid inputs, `specialties` array, `license` optional, `email` format), `status` enum | Vitest. Mirror existing `professional.schema.test.ts` structure |
| Unit — data | `getProfessionals` pagination + filtering, `createProfessional` split-write atomicity, `updateProfessional` partial update, P2002/P2025 error injection | Vitest + in-memory Prisma or mocked transaction |
| Unit — actions | RBAC rejection per role, Zod parse errors, P2002→email duplicate, auth guard | Vitest + mocked auth/data layers |
| Unit — components | `ProfessionalForm` validation, `TagInput` add/remove/dedup, `ProfessionalTable` row rendering, `ProfessionalStatusBadge` variants | Vitest + React Testing Library |
| Integration | `createProfessional` → `getProfessionalById` round-trip, `revalidatePath` coverage | Vitest (no E2E runner deployed) |

## Migration / Rollout

No migration required — no production professionals exist. Each PR is independently revertable. `getProfessionalsForService` call site in bookings module updated in PR #1 (type-check gate only; internal shape unchanged).

## Open Questions

- [ ] None — all technical decisions resolved through existing module patterns.
