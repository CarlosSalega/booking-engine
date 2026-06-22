/**
 * Patients module — actions barrel.
 *
 * Re-exports the three Server Actions, the Zod 4 input schemas, and the
 * shared `PatientResult<T>` discriminated union. Consumers should import
 * from `@/modules/patients/actions` (or via the patients module barrel)
 * rather than reaching into individual files.
 *
 * Server Actions (`createPatient`, `updatePatient`, `changePatientStatus`)
 * are tagged `"use server"` and can be imported from Client Components.
 */

export {
  changePatientStatusSchema,
  createPatientSchema,
  updatePatientSchema,
} from "./patient-actions.schema";

export type {
  ChangeStatusInput,
  CreatePatientInput,
  PatientError,
  PatientResult,
  PatientSuccess,
  UpdatePatientInput,
} from "./patient-actions.types";

export { changePatientStatus } from "./change-patient-status.action";
export { createPatient } from "./create-patient.action";
export { updatePatient } from "./update-patient.action";
