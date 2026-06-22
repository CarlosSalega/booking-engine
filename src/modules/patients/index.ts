/**
 * Patients module — public barrel.
 *
 * Re-exports the domain types, the data access layer (queries + types),
 * and the three Server Actions. The data layer's `createPatient` and
 * `updatePatient` are intentionally NOT re-exported here because they
 * share names with the Server Actions; the actions are the public API
 * and the data-layer write functions are implementation details used by
 * the actions themselves.
 *
 * Consumers should import from `@/modules/patients`:
 *   - Server Components  → `getPatients`, `getPatientById`
 *   - Client Components  → `createPatient`, `updatePatient`,
 *                          `changePatientStatus` (Server Actions)
 *   - Types              → `EnrichedPatient`, `PatientFilters`,
 *                          `CreatePatientInput`, `UpdatePatientInput`,
 *                          `ChangeStatusInput`, `PatientResult`
 */

export * from "./domain";

// Re-export the data layer's public API explicitly. The writes
// (`createPatient` and `updatePatient`) are NOT re-exported — they share
// names with the Server Actions and the actions are the public surface.
export { getPatients, getPatientById, PatientNotFoundError } from "./data/patient-data";
export type {
  EnrichedPatient,
  PatientFilters,
  PaginatedPatients,
  CreatePatientInput as CreatePatientDataInput,
  UpdatePatientInput as UpdatePatientDataInput,
} from "./data/patient-data.types";
export { DEFAULT_PAGE_SIZE } from "./data/patient-data.types";

// Server Actions + their schemas + result/input types
export * from "./actions";
