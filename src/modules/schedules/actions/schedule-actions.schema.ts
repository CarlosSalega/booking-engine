import { z } from "zod";

import { weeklyScheduleIntervalSchema } from "../domain";

export const getProfessionalScheduleSchema = z.object({
  professionalId: z.uuid({ error: "ID de profesional inválido" }),
});

export const replaceProfessionalScheduleSchema = z.object({
  professionalId: z.uuid({ error: "ID de profesional inválido" }),
  intervals: z.array(weeklyScheduleIntervalSchema),
});
