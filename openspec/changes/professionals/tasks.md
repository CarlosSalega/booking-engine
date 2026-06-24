# Tasks: Professionals Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Changed lines | ~1,550 in 4 PRs |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 (350) → PR #2 (400) → PR #3 (400) → PR #4 (400) |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |
| Base boundary | PR #2-#4 base = previous PR branch |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units

| Unit | Goal | PR | Base |
|------|------|----|------|
| 1 | Domain + data | PR #1 | feature/professionals |
| 2 | Actions + RBAC | PR #2 | PR #1 branch |
| 3 | List + components | PR #3 | PR #2 branch |
| 4 | Detail + create + edit | PR #4 | PR #3 branch |

## PR #1 — Domain + Data

- [x] 1.1 RED: rewrite `domain/__tests__/professional.schema.test.ts` for email, specialties[], license, userId, image, `strict()`
- [x] 1.2 GREEN: rewrite `domain/professional.schema.ts`; add `professionalDataSchema.strict()`
- [x] 1.3 Update `domain/index.ts`; add `data/professional-data.types.ts` (DTOs, filters, paginated, inputs)
- [x] 1.4 RED: `data/__tests__/professional-data.test.ts` (filters, pagination, split-write, P2025)
- [x] 1.5 GREEN: `getProfessionals`, `getProfessionalById`, `createProfessional`, `updateProfessional` + `ProfessionalNotFoundError`
- [x] 1.6 Update module `index.ts`; retype `bookings/data/booking-data.ts`

Verify: `pnpm test professional && pnpm type-check && pnpm lint`

## PR #2 — Actions

- [ ] 2.1 Add `actions/professional-actions.schema.ts` + `.types.ts` (`ProfessionalResult<T>`, inputs)
- [ ] 2.2 RED: `__tests__/create-professional.test.ts` (RBAC, Zod, P2002 dup-email)
- [ ] 2.3 GREEN: `create-professional.action.ts` (Zod → auth → RBAC PROFESSIONAL block → split-write → revalidate)
- [ ] 2.4 RED: `__tests__/update-professional.test.ts` (not found, wrong org, validation)
- [ ] 2.5 GREEN: `update-professional.action.ts` (Zod → getById guard → split-write → revalidate)
- [ ] 2.6 RED: `__tests__/change-professional-status.test.ts` (RBAC, invalid status)
- [ ] 2.7 GREEN: `change-professional-status.action.ts` (flip → revalidate); barrels

Verify: `pnpm test professionals/actions && pnpm type-check && pnpm lint`

## PR #3 — List + Components

- [ ] 3.1 Add `presentation/formatters.ts` (`getProfessionalStatusLabel`, `formatSpecialties`) + tests
- [ ] 3.2 Add `components/professionals/tag-input.tsx` (controlled `string[]`, Enter/Backspace, dedup) + tests
- [ ] 3.3 Add `professional-status-badge.tsx` (ACTIVE emerald / INACTIVE gray) + tests
- [ ] 3.4 Add `professional-status-filter.tsx` (URL `?status=`) + tests
- [ ] 3.5 Add `professional-search-bar.tsx` (debounced URL `?search=`) + tests
- [ ] 3.6 Add `professional-table-skeleton.tsx`
- [ ] 3.7 RED → GREEN: `professional-table.tsx` (5 cols, table+cards, pagination) + tests
- [ ] 3.8 Rewrite `app/(dashboard)/dashboard/professionals/page.tsx` (Suspense, parseFilters, getCanCreate)

Verify: `pnpm test professional && pnpm type-check && pnpm lint`

## PR #4 — Detail + Create + Edit

- [ ] 4.1 Add `components/professionals/professional-form.tsx` (name, email, specialties via TagInput, license, bio, status) + tests
- [ ] 4.2 Add `components/professionals/professional-detail-card.tsx` (info + status dropdown wired to action) + tests
- [ ] 4.3 Add `app/(dashboard)/dashboard/professionals/new/page.tsx` (form, redirect on success)
- [ ] 4.4 Add `app/(dashboard)/dashboard/professionals/[id]/edit/page.tsx` (fetch → form, 404 on null)
- [ ] 4.5 Add `app/(dashboard)/dashboard/professionals/[id]/page.tsx` (notFound, RBAC-gated edit/toggle)

Verify: `pnpm test && pnpm type-check && pnpm lint && pnpm test:coverage`
