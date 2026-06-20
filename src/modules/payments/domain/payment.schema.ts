import { z } from "zod";

import { PaymentProvider, ProviderPaymentStatus } from "./payment";

export const providerPaymentSchema = z.object({
  provider: z.enum(
    Object.values(PaymentProvider) as [string, ...string[]],
  ),
  status: z.enum(
    Object.values(ProviderPaymentStatus) as [string, ...string[]],
  ),
  amount: z.number().positive("Amount must be greater than 0"),
  retryCount: z.number().int().nonnegative().default(0),
  parentPaymentId: z.string().optional(),
});

export const paymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  provider: z.enum(
    Object.values(PaymentProvider) as [string, ...string[]],
  ),
  amount: z.number().positive("Amount must be greater than 0"),
  retryCount: z.number().int().nonnegative().default(0),
  parentPaymentId: z.string().optional(),
});
