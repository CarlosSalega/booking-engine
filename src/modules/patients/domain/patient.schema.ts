import { z } from "zod";

import { PatientStatus } from "./patient";

export const patientSchema = z.object({
  id: z.uuid({ error: "Invalid UUID" }),
  organizationId: z.uuid({ error: "Invalid UUID" }),
  fullName: z
    .string()
    .min(1, { error: "Full name is required" })
    .max(100, { error: "Full name must be 100 characters or less" }),
  email: z
    .string()
    .email({ error: "Invalid email format" })
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]{6,20}$/, { error: "Invalid phone number" })
    .optional(),
  documentId: z
    .string()
    .regex(/^\d{7,8}$/, {
      error: "Document ID must be 7-8 digits with no separators",
    })
    .optional(),
  status: z.enum(
    [PatientStatus.ACTIVE, PatientStatus.INACTIVE, PatientStatus.BLOCKED],
    { error: "Invalid patient status" },
  ),
  notes: z
    .string()
    .max(1000, { error: "Notes must be 1000 characters or less" })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const patientDataSchema = patientSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .strict();

export type Patient = z.infer<typeof patientSchema>;
export type PatientData = z.infer<typeof patientDataSchema>;
