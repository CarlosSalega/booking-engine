import { z } from "zod";

import { ProfessionalStatus } from "./professional";

export const professionalSchema = z.object({
  id: z.uuid({ error: "Invalid UUID" }),
  organizationId: z.uuid({ error: "Invalid UUID" }),
  fullName: z
    .string()
    .min(1, { error: "Full name must be 1-100 characters" })
    .max(100, { error: "Full name must be 1-100 characters" }),
  specialty: z
    .string()
    .max(100, { error: "Specialty max 100 characters" })
    .optional(),
  bio: z
    .string()
    .max(1000, { error: "Bio max 1000 characters" })
    .optional(),
  avatarUrl: z
    .url({ error: "Avatar must be a valid URL" })
    .optional(),
  status: z.enum([ProfessionalStatus.ACTIVE, ProfessionalStatus.INACTIVE], {
    error: "Invalid status",
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Professional = z.infer<typeof professionalSchema>;
