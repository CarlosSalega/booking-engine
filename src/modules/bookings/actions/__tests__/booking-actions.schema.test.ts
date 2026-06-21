/**
 * Tests for the bookings action Zod schemas.
 *
 * The schemas are the single source of truth for what each Server Action
 * accepts — the action files `safeParse` against them, and the input
 * types are inferred via `z.infer`. Each test exercises the happy path
 * (valid input parses) and at least one rejection path (invalid input
 * returns a Spanish user-facing error message).
 *
 * The schemas are pure (no IO), so we test them directly without mocks.
 */

import { describe, expect, it } from "vitest";

import {
  cancelBookingSchema,
  completeBookingSchema,
  confirmBookingSchema,
  createBookingSchema,
  markNoShowSchema,
  rescheduleBookingSchema,
} from "../booking-actions.schema";

const PROFESSIONAL_ID = "00000000-0000-4000-8000-000000000011";
const SERVICE_ID = "00000000-0000-4000-8000-000000000012";
const PATIENT_ID = "00000000-0000-4000-8000-000000000013";
const BOOKING_ID = "00000000-0000-4000-8000-000000000020";

describe("createBookingSchema", () => {
  it("accepts a valid booking with a patient (registered user)", () => {
    const result = createBookingSchema.safeParse({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: new Date("2026-06-19T10:00:00Z"),
      patientId: PATIENT_ID,
      notes: "Primera consulta",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a guest booking (no patientId) with guest contact info", () => {
    const result = createBookingSchema.safeParse({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: new Date("2026-06-19T10:00:00Z"),
      guestName: "Juan Pérez",
      guestPhone: "351-1234567",
      guestEmail: "juan@email.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing required fields (professionalId, serviceId, startTime)", () => {
    const result = createBookingSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects a non-UUID professionalId", () => {
    const result = createBookingSchema.safeParse({
      professionalId: "not-a-uuid",
      serviceId: SERVICE_ID,
      startTime: new Date("2026-06-19T10:00:00Z"),
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID patientId when provided", () => {
    const result = createBookingSchema.safeParse({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: new Date("2026-06-19T10:00:00Z"),
      patientId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 1000 characters", () => {
    const result = createBookingSchema.safeParse({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: new Date("2026-06-19T10:00:00Z"),
      notes: "x".repeat(1001),
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid guestEmail format", () => {
    const result = createBookingSchema.safeParse({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: new Date("2026-06-19T10:00:00Z"),
      guestName: "Juan",
      guestEmail: "not-an-email",
    });

    expect(result.success).toBe(false);
  });
});

describe("confirmBookingSchema", () => {
  it("accepts a valid bookingId", () => {
    const result = confirmBookingSchema.safeParse({ bookingId: BOOKING_ID });
    expect(result.success).toBe(true);
  });

  it("rejects missing bookingId", () => {
    const result = confirmBookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID bookingId", () => {
    const result = confirmBookingSchema.safeParse({ bookingId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("cancelBookingSchema", () => {
  it("accepts a valid bookingId without a reason", () => {
    const result = cancelBookingSchema.safeParse({ bookingId: BOOKING_ID });
    expect(result.success).toBe(true);
  });

  it("accepts a valid bookingId with a reason", () => {
    const result = cancelBookingSchema.safeParse({
      bookingId: BOOKING_ID,
      reason: "Paciente no puede asistir",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a reason longer than 500 characters", () => {
    const result = cancelBookingSchema.safeParse({
      bookingId: BOOKING_ID,
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing bookingId", () => {
    const result = cancelBookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("completeBookingSchema", () => {
  it("accepts a valid bookingId", () => {
    const result = completeBookingSchema.safeParse({ bookingId: BOOKING_ID });
    expect(result.success).toBe(true);
  });

  it("rejects missing bookingId", () => {
    const result = completeBookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID bookingId", () => {
    const result = completeBookingSchema.safeParse({ bookingId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("markNoShowSchema", () => {
  it("accepts a valid bookingId", () => {
    const result = markNoShowSchema.safeParse({ bookingId: BOOKING_ID });
    expect(result.success).toBe(true);
  });

  it("rejects missing bookingId", () => {
    const result = markNoShowSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("rescheduleBookingSchema", () => {
  it("accepts a valid bookingId and newStartTime", () => {
    const result = rescheduleBookingSchema.safeParse({
      bookingId: BOOKING_ID,
      newStartTime: new Date("2026-06-22T11:00:00Z"),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing newStartTime", () => {
    const result = rescheduleBookingSchema.safeParse({ bookingId: BOOKING_ID });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID bookingId", () => {
    const result = rescheduleBookingSchema.safeParse({
      bookingId: "not-a-uuid",
      newStartTime: new Date("2026-06-22T11:00:00Z"),
    });
    expect(result.success).toBe(false);
  });
});
