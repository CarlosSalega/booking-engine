import { z } from "zod";

import {
  isValidDayOfWeek,
  isValidMinute,
  MINUTES_PER_DAY,
} from "./weekly-schedule-interval";

export const weeklyScheduleIntervalSchema = z
  .object({
    dayOfWeek: z.number().int().refine(isValidDayOfWeek, {
      error: "Day of week must be an integer from 0 to 6",
    }),
    startMinute: z.number().int().refine(isValidMinute, {
      error: "Start minute must be an integer from 0 to 1440",
    }),
    endMinute: z.number().int().refine(isValidMinute, {
      error: "End minute must be an integer from 0 to 1440",
    }),
  })
  .superRefine((interval, ctx) => {
    if (interval.startMinute >= MINUTES_PER_DAY) {
      ctx.addIssue({
        code: "custom",
        path: ["startMinute"],
        message: "Start minute must be before the end of the day",
      });
    }

    if (interval.startMinute >= interval.endMinute) {
      ctx.addIssue({
        code: "custom",
        path: ["endMinute"],
        message: "End minute must be greater than start minute",
      });
    }
  })
  .strict();
