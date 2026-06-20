import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { PaymentStatus } from "@/modules/services/domain";
import {
  BookingStatus,
  canTransition,
  calculateEndTime,
  type BookingStatusType,
} from "../booking";
import {
  type Booking,
  type BookingData,
  bookingDataSchema,
  bookingSchema,
  timeSlotSchema,
} from "../booking.schema";
import { isOverlapping, isValidTimeSlot, type TimeSlot } from "../time-slot";
import {
  bookingDataSchema as bookingDataSchemaFromBarrel,
  bookingSchema as bookingSchemaFromBarrel,
  calculateEndTime as calculateEndTimeFromBarrel,
  isOverlapping as isOverlappingFromBarrel,
  isValidTimeSlot as isValidTimeSlotFromBarrel,
  timeSlotSchema as timeSlotSchemaFromBarrel,
} from "@/modules/bookings";
import type {
  Booking as BookingFromBarrel,
  BookingData as BookingDataFromBarrel,
  BookingStatusType as BookingStatusTypeFromBarrel,
  TimeSlot as TimeSlotFromBarrel,
} from "@/modules/bookings";

describe("BookingStatus", () => {
  it("exposes all 7 expected status values", () => {
    expect(BookingStatus.PENDING).toBe("PENDING");
    expect(BookingStatus.CONFIRMED).toBe("CONFIRMED");
    expect(BookingStatus.CANCELLED).toBe("CANCELLED");
    expect(BookingStatus.RESCHEDULED).toBe("RESCHEDULED");
    expect(BookingStatus.COMPLETED).toBe("COMPLETED");
    expect(BookingStatus.NO_SHOW).toBe("NO_SHOW");
    expect(BookingStatus.AWAITING_PAYMENT).toBe("AWAITING_PAYMENT");
    // Type-level: ensure derived type is assignable from a literal of the union
    const sample: BookingStatusType = BookingStatus.PENDING;
    expect(sample).toBe("PENDING");
  });
});

describe("isValidTimeSlot", () => {
  it("returns true when startTime < endTime", () => {
    const slot: TimeSlot = {
      startTime: new Date("2026-06-19T10:00:00Z"),
      endTime: new Date("2026-06-19T11:00:00Z"),
    };
    expect(isValidTimeSlot(slot)).toBe(true);
  });

  it("returns false when startTime equals endTime", () => {
    const t = new Date("2026-06-19T10:00:00Z");
    const slot: TimeSlot = { startTime: t, endTime: t };
    expect(isValidTimeSlot(slot)).toBe(false);
  });

  it("returns false when startTime > endTime (reversed)", () => {
    const slot: TimeSlot = {
      startTime: new Date("2026-06-19T11:00:00Z"),
      endTime: new Date("2026-06-19T10:00:00Z"),
    };
    expect(isValidTimeSlot(slot)).toBe(false);
  });
});

describe("isOverlapping", () => {
  const a: TimeSlot = {
    startTime: new Date("2026-06-19T10:00:00Z"),
    endTime: new Date("2026-06-19T11:00:00Z"),
  };

  it("returns true for fully overlapping ranges (partial)", () => {
    const b: TimeSlot = {
      startTime: new Date("2026-06-19T10:30:00Z"),
      endTime: new Date("2026-06-19T11:30:00Z"),
    };
    expect(isOverlapping(a, b)).toBe(true);
  });

  it("returns false for adjacent ranges (touching boundary)", () => {
    const b: TimeSlot = {
      startTime: new Date("2026-06-19T11:00:00Z"),
      endTime: new Date("2026-06-19T12:00:00Z"),
    };
    expect(isOverlapping(a, b)).toBe(false);
  });

  it("returns true for identical ranges", () => {
    const b: TimeSlot = {
      startTime: new Date("2026-06-19T10:00:00Z"),
      endTime: new Date("2026-06-19T11:00:00Z"),
    };
    expect(isOverlapping(a, b)).toBe(true);
  });

  it("returns true for partial overlap (a starts before b, b ends before a)", () => {
    const b: TimeSlot = {
      startTime: new Date("2026-06-19T09:30:00Z"),
      endTime: new Date("2026-06-19T10:30:00Z"),
    };
    expect(isOverlapping(a, b)).toBe(true);
  });

  it("returns true when one range fully contains the other", () => {
    const b: TimeSlot = {
      startTime: new Date("2026-06-19T10:15:00Z"),
      endTime: new Date("2026-06-19T10:45:00Z"),
    };
    expect(isOverlapping(a, b)).toBe(true);
  });
});

describe("canTransition", () => {
  it("allows PENDING → CONFIRMED (valid transition)", () => {
    expect(canTransition(BookingStatus.PENDING, BookingStatus.CONFIRMED)).toBe(
      true,
    );
  });

  it("allows CONFIRMED → COMPLETED (valid transition)", () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)).toBe(
      true,
    );
  });

  it("rejects COMPLETED → PENDING (terminal state, no outgoing edges)", () => {
    expect(canTransition(BookingStatus.COMPLETED, BookingStatus.PENDING)).toBe(
      false,
    );
  });

  it("rejects CONFIRMED → PENDING (reverse transition)", () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.PENDING)).toBe(
      false,
    );
  });

  it("allows self-transition CONFIRMED → CONFIRMED", () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CONFIRMED)).toBe(
      true,
    );
  });

  it("rejects CANCELLED → CONFIRMED (terminal state)", () => {
    expect(
      canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED),
    ).toBe(false);
  });
});

describe("calculateEndTime", () => {
  it("adds durationMinutes to startTime (10:00 + 30min → 10:30)", () => {
    const start = new Date("2026-06-19T10:00:00Z");
    const end = calculateEndTime(start, 30);
    expect(end.toISOString()).toBe("2026-06-19T10:30:00.000Z");
  });

  it("returns the same instant for zero duration (10:00 + 0min → 10:00)", () => {
    const start = new Date("2026-06-19T10:00:00Z");
    const end = calculateEndTime(start, 0);
    expect(end.getTime()).toBe(start.getTime());
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Validation schemas, barrels, isolation
// ---------------------------------------------------------------------------

const BOOKING_ID = "550e8400-e29b-41d4-a716-446655440000";
const ORG_ID = "550e8400-e29b-41d4-a716-446655440001";
const PATIENT_ID = "550e8400-e29b-41d4-a716-446655440002";
const PROFESSIONAL_ID = "550e8400-e29b-41d4-a716-446655440003";
const SERVICE_ID = "550e8400-e29b-41d4-a716-446655440004";

function makeValidBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    patientId: PATIENT_ID,
    professionalId: PROFESSIONAL_ID,
    serviceId: SERVICE_ID,
    startTime: new Date("2026-06-19T10:00:00Z"),
    endTime: new Date("2026-06-19T10:30:00Z"),
    status: BookingStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    createdAt: new Date("2026-06-19T09:00:00Z"),
    updatedAt: new Date("2026-06-19T09:00:00Z"),
    ...overrides,
  };
}

describe("bookingSchema", () => {
  it("parses a valid full booking with all 12 fields", () => {
    const input = makeValidBooking({ notes: "Patient requested morning slot" });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Patient requested morning slot");
      expect(result.data.status).toBe(BookingStatus.PENDING);
      expect(result.data.paymentStatus).toBe(PaymentStatus.PENDING);
    }
  });

  it("parses a minimal valid booking (no notes)", () => {
    const input = makeValidBooking();
    delete (input as { notes?: string }).notes;
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID on the id field", () => {
    const input = makeValidBooking({ id: "not-a-uuid" });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const idIssue = result.error.issues.find((i) => i.path[0] === "id");
      expect(idIssue?.message).toBe("Invalid UUID");
    }
  });

  it("rejects an invalid UUID on the serviceId field", () => {
    const input = makeValidBooking({ serviceId: "bad-uuid" });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "serviceId");
      expect(issue?.message).toBe("Invalid UUID");
    }
  });

  it("rejects an unknown booking status", () => {
    const input = makeValidBooking({ status: "UNKNOWN" as BookingStatusType });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "status");
      expect(issue?.message).toBe("Invalid booking status");
    }
  });

  it("rejects an unknown payment status", () => {
    const input = makeValidBooking({ paymentStatus: "UNPAID" as never });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "paymentStatus",
      );
      expect(issue?.message).toBe("Invalid payment status");
    }
  });

  it("rejects notes longer than 1000 characters", () => {
    const input = makeValidBooking({ notes: "a".repeat(1001) });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "notes");
      expect(issue?.message).toBe("Notes max 1000 characters");
    }
  });

  it("accepts notes exactly 1000 characters long", () => {
    const input = makeValidBooking({ notes: "a".repeat(1000) });
    const result = bookingSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("bookingDataSchema", () => {
  it("accepts a payload without id, createdAt, updatedAt", () => {
    const { id, createdAt, updatedAt, ...payload } = makeValidBooking();
    void id;
    void createdAt;
    void updatedAt;
    const result = bookingDataSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      // Type-level: BookingData must NOT carry id/createdAt/updatedAt
      const sample: BookingData = result.data;
      expect(sample).toBeDefined();
    }
  });

  it("rejects a payload that includes id (strict mode)", () => {
    const result = bookingDataSchema.safeParse(makeValidBooking());
    expect(result.success).toBe(false);
    if (!result.success) {
      const idIssue = result.error.issues.find(
        (i) =>
          i.path[0] === "id" ||
          i.message.toLowerCase().includes("unrecognized") ||
          i.message.toLowerCase().includes("unknown"),
      );
      expect(idIssue).toBeDefined();
    }
  });
});

describe("barrel completeness", () => {
  it("re-exports all 12 public symbols from @/modules/bookings", () => {
    // Runtime exports — referenced so the import is not tree-shaken
    expect(typeof BookingStatus).toBe("object");
    expect(typeof isValidTimeSlot).toBe("function");
    expect(typeof isOverlapping).toBe("function");
    expect(typeof canTransition).toBe("function");
    expect(typeof calculateEndTime).toBe("function");
    expect(typeof bookingSchema).toBe("object");
    expect(typeof bookingDataSchema).toBe("object");
    expect(typeof timeSlotSchema).toBe("object");

    // Barrel re-exports must point to the same identity as direct imports
    expect(bookingSchemaFromBarrel).toBe(bookingSchema);
    expect(bookingDataSchemaFromBarrel).toBe(bookingDataSchema);
    expect(timeSlotSchemaFromBarrel).toBe(timeSlotSchema);
    expect(isValidTimeSlotFromBarrel).toBe(isValidTimeSlot);
    expect(isOverlappingFromBarrel).toBe(isOverlapping);
    expect(calculateEndTimeFromBarrel).toBe(calculateEndTime);

    // Type-level: type-only barrel imports must compile (already verified by tsc)
    type _CheckTypes =
      | BookingFromBarrel
      | BookingDataFromBarrel
      | BookingStatusTypeFromBarrel
      | TimeSlotFromBarrel;
    const _typeProbe: _CheckTypes | undefined = undefined;
    expect(_typeProbe).toBeUndefined();
  });
});

describe("module isolation", () => {
  it("domain files do not import next/*, react, or @prisma/client", () => {
    const domainDir = join(__dirname, "..");
    const files = [
      "booking.ts",
      "time-slot.ts",
      "booking.schema.ts",
      "index.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(domainDir, file), "utf-8");
      expect(
        source,
        `${file} must not import from next/*`,
      ).not.toMatch(/from\s+["']next\//);
      expect(
        source,
        `${file} must not import react`,
      ).not.toMatch(/from\s+["']react["']/);
      expect(
        source,
        `${file} must not import @prisma/client`,
      ).not.toMatch(/from\s+["']@prisma\/client/);
    }
  });
});
