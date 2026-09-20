import type { z } from "zod";

import type {
  getProfessionalScheduleSchema,
  replaceProfessionalScheduleSchema,
} from "./schedule-actions.schema";

export type ScheduleSuccess<T> = T extends void
  ? { success: true; data?: never }
  : { success: true; data: T };
export type ScheduleError = { success: false; error: string };
export type ScheduleResult<T = void> = ScheduleSuccess<T> | ScheduleError;

export type GetProfessionalScheduleInput = z.infer<
  typeof getProfessionalScheduleSchema
>;
export type ReplaceProfessionalScheduleInput = z.infer<
  typeof replaceProfessionalScheduleSchema
>;
