/**
 * Services module — public barrel.
 *
 * Re-exports the domain types, the data access layer (queries + types).
 * Server Actions and presentation formatters will be added in later PRs
 * (PR #2 and PR #3 respectively).
 *
 * The data layer's `createService` and `updateService` are NOT
 * re-exported from this barrel yet because they will share names with
 * the Server Actions in PR #2. The actions will be the public API for
 * writes; the data-layer write functions are implementation details used
 * by the actions themselves.
 *
 * Consumers should import from `@/modules/services`:
 *   - Server Components  → `getServices`, `getServiceById`
 *   - Types              → `EnrichedService`, `ServiceFilters`,
 *                          `PaginatedServices`, `DEFAULT_PAGE_SIZE`
 */

export * from "./domain";

// Re-export the data layer's public API explicitly. The writes
// (`createService` and `updateService`) are NOT re-exported — they share
// names with the upcoming Server Actions (PR #2) and the actions are
// the public surface.
export {
  getServices,
  getServiceById,
  ServiceNotFoundError,
} from "./data/service-data";
export type {
  EnrichedService,
  ServiceFilters,
  PaginatedServices,
  CreateServiceInput as CreateServiceDataInput,
  UpdateServiceInput as UpdateServiceDataInput,
} from "./data/service-data.types";
export { DEFAULT_PAGE_SIZE } from "./data/service-data.types";
