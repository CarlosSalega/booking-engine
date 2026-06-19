import { z } from "zod";

import { Currency, PaymentType, ServiceStatus } from "./service";

export const moneySchema = z.object({
  amount: z
    .number()
    .gte(0, { error: "Amount must not be negative" })
    .multipleOf(0.01, { error: "Amount must have at most 2 decimal places" }),
  currency: z.enum([Currency.ARS, Currency.USD]),
});

export const serviceSchema = z
  .object({
    id: z.uuid(),
    organizationId: z.uuid(),
    name: z
      .string()
      .min(1, { error: "Name must be 1-100 characters" })
      .max(100, { error: "Name must be 1-100 characters" }),
    description: z
      .string()
      .max(500, { error: "Description max 500 characters" })
      .optional(),
    durationMinutes: z
      .number()
      .int()
      .positive({ error: "Duration must be a positive integer" }),
    price: moneySchema.optional(),
    status: z.enum([ServiceStatus.ACTIVE, ServiceStatus.INACTIVE]),
    paymentType: z.enum([
      PaymentType.NONE,
      PaymentType.DEPOSIT,
      PaymentType.FULL,
    ]),
    depositAmount: moneySchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === PaymentType.DEPOSIT) {
      if (data.depositAmount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit is required for DEPOSIT payment type",
          path: ["depositAmount"],
        });
      } else if (data.depositAmount.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit amount must be greater than zero",
          path: ["depositAmount"],
        });
      }
    }

    if (
      data.depositAmount &&
      data.price &&
      data.depositAmount.amount > data.price.amount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit must not exceed price",
        path: ["depositAmount"],
      });
    }

    if (
      data.paymentType === PaymentType.NONE &&
      data.depositAmount !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit not allowed for NONE payment type",
        path: ["depositAmount"],
      });
    }
  });

export type Service = z.infer<typeof serviceSchema>;
