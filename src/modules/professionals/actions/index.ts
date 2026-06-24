/**
 * Professionals module — actions barrel.
 *
 * Re-exports the three Server Actions, the Zod 4 input schemas, and the
 * shared `ProfessionalResult<T>` discriminated union. Consumers should
 * import from `@/modules/professionals/actions` (or via the professionals
 * module barrel) rather than reaching into individual files.
 *
 * Server Actions (`createProfessional`, `updateProfessional`,
 * `changeProfessionalStatus`) are tagged `"use server"` and can be
 * imported from Client Components.
 */

export {
  actionSpecialtiesSchema,
  changeProfessionalStatusSchema,
  createProfessionalSchema,
  updateProfessionalSchema,
} from "./professional-actions.schema";

export type {
  ChangeProfessionalStatusInput,
  CreateProfessionalInput,
  ProfessionalError,
  ProfessionalResult,
  ProfessionalSuccess,
  UpdateProfessionalInput,
} from "./professional-actions.types";

export { changeProfessionalStatus } from "./change-professional-status.action";
export { createProfessional } from "./create-professional.action";
export { updateProfessional } from "./update-professional.action";
