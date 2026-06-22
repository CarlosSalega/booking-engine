/**
 * Services module — actions barrel.
 *
 * Re-exports the three Server Actions, the Zod 4 input schemas, and the
 * shared `ServiceResult<T>` discriminated union. Consumers should import
 * from `@/modules/services/actions` (or via the services module barrel)
 * rather than reaching into individual files.
 *
 * Server Actions (`createService`, `updateService`, `changeServiceStatus`)
 * are tagged `"use server"` and can be imported from Client Components.
 */

export {
  actionMoneySchema,
  changeServiceStatusSchema,
  createServiceSchema,
  updateServiceSchema,
} from "./service-actions.schema";

export type {
  ChangeServiceStatusInput,
  CreateServiceInput,
  ServiceError,
  ServiceResult,
  ServiceSuccess,
  UpdateServiceInput,
} from "./service-actions.types";

export { changeServiceStatus } from "./change-service-status.action";
export { createService } from "./create-service.action";
export { updateService } from "./update-service.action";
