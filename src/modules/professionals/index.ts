/**
 * Professionals module — public barrel.
 *
 * Re-exports the domain types and the data access layer (queries + types).
 * Server actions and presentation formatters will be added in PR #2 and
 * PR #3 of the chained delivery.
 *
 * The data layer's `createProfessional` and `updateProfessional` are
 * intentionally NOT re-exported here because they share names with the
 * Server Actions (added in PR #2). Until the actions land, callers can
 * import them directly from `@/modules/professionals/data/professional-data`.
 *
 * Consumers should import from `@/modules/professionals`:
 *   - Server Components  → `getProfessionals`, `getProfessionalById`
 *   - Types              → `Professional`, `ProfessionalData`,
 *                          `ProfessionalStatus`, `ProfessionalStatusType`,
 *                          `professionalSchema`, `professionalDataSchema`,
 *                          `EnrichedProfessional`, `ProfessionalFilters`,
 *                          `PaginatedProfessionals`, `DEFAULT_PAGE_SIZE`,
 *                          `CreateProfessionalInput`,
 *                          `UpdateProfessionalInput`
 */

export * from "./domain";

// Re-export the data layer's public reads. The writes
// (`createProfessional` and `updateProfessional`) are NOT re-exported
// yet — they will be re-exported under the same name in PR #2 when the
// Server Actions land. The writes are available via direct path import
// until then.
export { getProfessionals, getProfessionalById, ProfessionalNotFoundError } from "./data/professional-data";
export type {
  EnrichedProfessional,
  ProfessionalFilters,
  PaginatedProfessionals,
  CreateProfessionalInput as CreateProfessionalDataInput,
  UpdateProfessionalInput as UpdateProfessionalDataInput,
} from "./data/professional-data.types";
export { DEFAULT_PAGE_SIZE } from "./data/professional-data.types";
