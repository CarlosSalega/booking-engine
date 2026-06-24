/**
 * Professionals module — public barrel.
 *
 * Re-exports the domain types, the data access layer (queries + types),
 * and the Server Actions. Presentation formatters will be added in PR
 * #3 of the chained delivery.
 *
 * The data layer's `createProfessional` and `updateProfessional` (writes)
 * are intentionally NOT re-exported here because they share names with
 * the Server Actions. Callers that need to write must go through the
 * actions (which enforce RBAC) or import the data-layer writes directly
 * from `@/modules/professionals/data/professional-data`.
 *
 * Consumers should import from `@/modules/professionals`:
 *   - Server Components  → `getProfessionals`, `getProfessionalById`
 *   - Server Actions     → `createProfessional`, `updateProfessional`,
 *                          `changeProfessionalStatus`
 *   - Presentation       → `getProfessionalStatusLabel`, `formatSpecialties`,
 *                          `PROFESSIONAL_STATUS_LABEL`
 *   - Types              → `Professional`, `ProfessionalData`,
 *                          `ProfessionalStatus`, `ProfessionalStatusType`,
 *                          `professionalSchema`, `professionalDataSchema`,
 *                          `EnrichedProfessional`, `ProfessionalFilters`,
 *                          `PaginatedProfessionals`, `DEFAULT_PAGE_SIZE`,
 *                          `CreateProfessionalDataInput`,
 *                          `UpdateProfessionalDataInput`,
 *                          `ProfessionalResult`
 */

export * from "./domain";
export * from "./presentation";

// Re-export the data layer's public reads. The writes
// (`createProfessional` and `updateProfessional`) are NOT re-exported
// — they are reached through the Server Actions, which enforce RBAC
// and Zod validation. The raw writes are still available via direct
// path import (`@/modules/professionals/data/professional-data`) for
// server-side scripts and tests.
export {
  getProfessionals,
  getProfessionalById,
  ProfessionalNotFoundError,
} from "./data/professional-data";
export type {
  EnrichedProfessional,
  ProfessionalFilters,
  PaginatedProfessionals,
  CreateProfessionalInput as CreateProfessionalDataInput,
  UpdateProfessionalInput as UpdateProfessionalDataInput,
} from "./data/professional-data.types";
export { DEFAULT_PAGE_SIZE } from "./data/professional-data.types";

// Re-export the Server Actions. The action files carry `"use server"`
// so they can be imported from Client Components.
export {
  changeProfessionalStatus,
  createProfessional,
  updateProfessional,
} from "./actions";
export type { ProfessionalResult } from "./actions";
