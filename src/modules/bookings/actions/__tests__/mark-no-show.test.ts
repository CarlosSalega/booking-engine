/**
 * Tests for the `markNoShow` Server Action.
 *
 * Same pattern as `completeBooking` (R+G combined per task 2.11 spec).
 * The action transitions CONFIRMED → NO_SHOW (terminal) for a patient
 * who never showed up.
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
  BOOKING_ID: "00000000-0000-4000-8000-000000000020",
}));

const { ORG_ID, USER_ID, PROFESSIONAL_USER_ID, PROFESSIONAL_ID, BOOKING_ID } = fixtures;

// ---------------------------------------------------------------------------
// Mock declarations.
// ---------------------------------------------------------------------------

const prismaMock = vi.hoisted(() => ({
  booking: {
    findFirst: vi.fn(),
    update: vi.fn(),
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

const { markNoShow } = await import("../mark-no-show.action");

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

const UPDATED_AT = new Date("2026-06-19T09:00:00Z");

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL", userId: string = USER_ID) {
  return { user: { id: userId, role } };
}

function confirmedBooking(overrides: Partial<{ professionalUserId: string; status: string }> = {}) {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    patientId: null,
    professionalId: PROFESSIONAL_ID,
    serviceId: "00000000-0000-4000-8000-000000000012",
    startTime: new Date("2026-06-19T10:00:00Z"),
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
  };
}

// ---------------------------------------------------------------------------
// Test suite.
// ---------------------------------------------------------------------------

describe("markNoShow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.booking.findFirst.mockResolvedValue(confirmedBooking());
    prismaMock.booking.update.mockResolvedValue({
      ...confirmedBooking(),
      status: "NO_SHOW",
    });
  });

  it("marks a CONFIRMED booking as NO_SHOW when called by ADMIN", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await markNoShow({ bookingId: BOOKING_ID });

    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BOOKING_ID, updatedAt: UPDATED_AT },
        data: { status: "NO_SHOW" },
      }),
    );
  });

  it("calls revalidatePath('/dashboard/bookings') after marking no-show", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await markNoShow({ bookingId: BOOKING_ID });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/bookings");
  });

  it("rejects when the current status is PENDING (not yet confirmed)", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ status: "PENDING" }),
    );
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await markNoShow({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("transición");
    }
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects when the booking does not exist", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await markNoShow({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
  });

  it("rejects unauthenticated requests with 'No autenticado'", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await markNoShow({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("returns a Zod error when input is invalid", async () => {
    // @ts-expect-error testing missing fields at runtime
    const result = await markNoShow({});

    expect(result.success).toBe(false);
  });

  it("rejects PROFESSIONAL marking no-show on a booking that is not theirs", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ professionalUserId: "00000000-0000-4000-8000-000000000099" }),
    );
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    const result = await markNoShow({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
  });

  it("translates Prisma P2025 (updatedAt mismatch) to a user-facing error", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    prismaMock.booking.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "7.8.0" },
      ),
    );

    const result = await markNoShow({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("otro usuario");
    }
  });
});
