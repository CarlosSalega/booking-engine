import { z } from "zod";

import { PaymentProvider, ProviderPaymentStatus } from "./payment";

export const providerPaymentSchema = z.object({
  id: z.string(),
  provider: z.enum(
    Object.values(PaymentProvider) as [string, ...string[]],
  ),
  status: z.enum(
    Object.values(ProviderPaymentStatus) as [string, ...string[]],
  ),
  amount: z.number().positive("Amount must be greater than 0"),
  retryCount: z.number().int().nonnegative().optional(),
  parentPaymentId: z.string().optional(),
});

export const paymentSchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  bookingId: z.string().uuid("Booking ID must be a valid UUID"),
  provider: z.enum(
    Object.values(PaymentProvider) as [string, ...string[]],
  ),
  amount: z.number().positive("Amount must be greater than 0"),
  preferenceId: z.string().optional(),
  externalReference: z.string().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  parentPaymentId: z.string().uuid().optional(),
});
