/**
 * Services module — public barrel.
 *
 * Re-exports the domain types, the data access layer (queries + types),
 * the three Server Actions, and (in PR #3) the presentation formatters.
 *
 * The data layer's `createService` and `updateService` are intentionally
 * NOT re-exported from this barrel because they share names with the
 * Server Actions; the actions are the public API and the data-layer
 * write functions are implementation details used by the actions
 * themselves.
 *
 * Consumers should import from `@/modules/services`:
 *   - Server Components  → `getServices`, `getServiceById`
 *   - Client Components  → `createService`, `updateService`,
 *                          `changeServiceStatus` (Server Actions)
 *   - Types              → `EnrichedService`, `ServiceFilters`,
 *                          `PaginatedServices`, `DEFAULT_PAGE_SIZE`,
 *                          `ServiceResult`, `CreateServiceInput`,
 *                          `UpdateServiceInput`,
 *                          `ChangeServiceStatusInput`
 */

export * from "./domain";

// Re-export the data layer's public API explicitly. The writes
// (`createService` and `updateService`) are NOT re-exported — they share
// names with the Server Actions and the actions are the public surface.
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

// Server Actions + their schemas + result/input types
export * from "./actions";
