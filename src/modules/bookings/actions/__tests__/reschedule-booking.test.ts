/**
 * Tests for the `rescheduleBooking` Server Action.
 *
 * The action is the most complex of the six: it runs a single Prisma
 * transaction that (a) checks the new slot is free (excluding the
 * booking being rescheduled), (b) marks the old booking as RESCHEDULED,
 * and (c) creates a new PENDING booking with the new start time.
 *
 * State machine: only CONFIRMED → RESCHEDULED is valid (RESCHEDULED is
 * a terminal state with no incoming edges from PENDING or AWAITING_PAYMENT).
 *
 * RBAC: ADMIN/SECRETARY full, PROFESSIONAL own-bookings only.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures.
// ---------------------------------------------------------------------------

const fixtures = vi.hoisted(() => ({
  ORG_ID: "00000000-0000-4000-8000-000000000001",
  USER_ID: "00000000-0000-4000-8000-000000000002",
  PROFESSIONAL_USER_ID: "00000000-0000-4000-8000-000000000010",
  PROFESSIONAL_ID: "00000000-0000-4000-8000-000000000011",
  SERVICE_ID: "00000000-0000-4000-8000-000000000012",
  PATIENT_ID: "00000000-0000-4000-8000-000000000013",
  BOOKING_ID: "00000000-0000-4000-8000-000000000020",
  NEW_BOOKING_ID: "00000000-0000-4000-8000-000000000030",
}));

const { ORG_ID, USER_ID, PROFESSIONAL_USER_ID, PROFESSIONAL_ID, SERVICE_ID, PATIENT_ID, BOOKING_ID, NEW_BOOKING_ID } = fixtures;

// ---------------------------------------------------------------------------
// Mock declarations.
// ---------------------------------------------------------------------------

const txMock = vi.hoisted(() => ({
  booking: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(
    async (cbOrArray: unknown) =>
      typeof cbOrArray === "function"
        ? (cbOrArray as (tx: typeof txMock) => unknown)(txMock)
        : cbOrArray,
  ),
  booking: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const getSessionMock = vi.fn();
vi.mock("@/core/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: vi.fn().mockResolvedValue(ORG_ID),
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { rescheduleBooking } = await import("../reschedule-booking.action");

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

const UPDATED_AT = new Date("2026-06-19T09:00:00Z");
const OLD_START = new Date("2026-06-19T10:00:00Z");
const NEW_START = new Date("2026-06-22T11:00:00Z");

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL", userId: string = USER_ID) {
  return { user: { id: userId, role } };
}

function confirmedBooking(overrides: Partial<{ professionalUserId: string; status: string }> = {}) {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    patientId: PATIENT_ID,
    professionalId: PROFESSIONAL_ID,
    serviceId: SERVICE_ID,
    startTime: OLD_START,
    endTime: new Date("2026-06-19T10:30:00Z"),
    status: overrides.status ?? "CONFIRMED",
    paymentStatus: "PENDING",
    notes: null,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    professional: {
      id: PROFESSIONAL_ID,
      userId: overrides.professionalUserId ?? PROFESSIONAL_USER_ID,
      user: { name: "Dr. García" },
    },
    service: {
      id: SERVICE_ID,
      durationMinutes: 30,
    },
  };
}

// ---------------------------------------------------------------------------
// Test suite.
// ---------------------------------------------------------------------------

describe("rescheduleBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.booking.findFirst.mockResolvedValue(confirmedBooking());
    txMock.booking.findFirst.mockResolvedValue(null); // no overlap by default
    txMock.booking.update.mockResolvedValue({
      ...confirmedBooking(),
      status: "RESCHEDULED",
    });
    txMock.booking.create.mockResolvedValue({
      id: NEW_BOOKING_ID,
      status: "PENDING",
      startTime: NEW_START,
      endTime: new Date("2026-06-22T11:30:00Z"),
    });
  });

  it("reschedules a CONFIRMED booking: marks old as RESCHEDULED and creates a new PENDING one", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(NEW_BOOKING_ID);
      expect(result.data.status).toBe("PENDING");
    }
  });

  it("uses exclude-self when checking overlap so the current booking doesn't conflict with itself", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    // The overlap check inside the transaction must exclude the booking being
    // rescheduled. The function reads from tx.booking.findFirst.
    const findFirstCall = txMock.booking.findFirst.mock.calls[0]?.[0];
    expect(findFirstCall?.where).toMatchObject({ id: { not: BOOKING_ID } });
  });

  it("returns 'Desired slot is occupied' when another booking overlaps the new time", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    txMock.booking.findFirst.mockResolvedValueOnce({ id: "other-booking" });

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("ocupado");
    }
    // The old booking should NOT have been updated, and no new booking
    // should have been created.
    expect(txMock.booking.update).not.toHaveBeenCalled();
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects when the booking is AWAITING_PAYMENT (state machine: only CONFIRMED/PENDING → RESCHEDULED)", async () => {
    // AWAITING_PAYMENT is not allowed to be rescheduled — the state
    // machine only accepts PENDING or CONFIRMED → RESCHEDULED.
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ status: "AWAITING_PAYMENT" }),
    );
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("transición");
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when the booking does not exist", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("no encontrado");
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 'No autenticado'", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("returns a Zod error when input is invalid (missing newStartTime)", async () => {
    // @ts-expect-error testing missing fields at runtime
    const result = await rescheduleBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
  });

  it("rejects PROFESSIONAL rescheduling a booking that is not theirs", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ professionalUserId: "00000000-0000-4000-8000-000000000099" }),
    );
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("calls revalidatePath('/dashboard/bookings') after a successful reschedule", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/bookings");
  });

  it("translates Prisma P2025 (optimistic lock failure on the old booking update) to a user-facing error", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    txMock.booking.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "7.8.0" },
      ),
    );

    const result = await rescheduleBooking({
      bookingId: BOOKING_ID,
      newStartTime: NEW_START,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("otro usuario");
    }
  });
});
