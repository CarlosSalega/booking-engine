import { z } from "zod";

import { PaymentStatus } from "@/modules/services/domain";

import { BookingStatus } from "./booking";

export const timeSlotSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
});

export const bookingSchema = z.object({
  id: z.uuid({ error: "Invalid UUID" }),
  organizationId: z.uuid({ error: "Invalid UUID" }),
  patientId: z
    .uuid({ error: "Invalid UUID" })
    .nullish(),
  professionalId: z.uuid({ error: "Invalid UUID" }),
  serviceId: z.uuid({ error: "Invalid UUID" }),
  startTime: z.date(),
  endTime: z.date(),
  status: z.enum(
    [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
      BookingStatus.AWAITING_PAYMENT,
    ],
    { error: "Invalid booking status" },
  ),
  paymentStatus: z.enum(
    [
      PaymentStatus.PENDING,
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ],
    { error: "Invalid payment status" },
  ),
  notes: z
    .string()
    .max(1000, { error: "Notes max 1000 characters" })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const bookingDataSchema = bookingSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .strict();

export type Booking = z.infer<typeof bookingSchema>;
export type BookingData = z.infer<typeof bookingDataSchema>;
