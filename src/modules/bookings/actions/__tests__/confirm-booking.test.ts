/**
 * Tests for the `confirmBooking` Server Action.
 *
 * Mirrors the create-booking test setup: same mock boundaries, same
 * queue-pollution discipline (we never queue a session mock in tests
 * that expect an early return).
 *
 * The action's job is a state transition with optimistic locking:
 *   PENDING | AWAITING_PAYMENT → CONFIRMED
 * The `updatedAt` in the WHERE clause is the optimistic lock — when it
 * doesn't match, Prisma throws P2025 and the action returns a Spanish
 * "Modified by another user" error.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Test fixtures — vi.hoisted so the mock factories can reference them.
// ---------------------------------------------------------------------------

const fixtures = vi.hoisted(() => ({
  ORG_ID: "00000000-0000-4000-8000-000000000001",
  USER_ID: "00000000-0000-4000-8000-000000000002",
  PROFESSIONAL_USER_ID: "00000000-0000-4000-8000-000000000010",
  PROFESSIONAL_ID: "00000000-0000-4000-8000-000000000011",
  SERVICE_ID: "00000000-0000-4000-8000-000000000012",
  PATIENT_ID: "00000000-0000-4000-8000-000000000013",
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
  professional: {
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

// Import after the mocks are in place.
const { confirmBooking } = await import("../confirm-booking.action");

// ---------------------------------------------------------------------------
// Test helpers.
// ---------------------------------------------------------------------------

const UPDATED_AT = new Date("2026-06-19T09:00:00Z");

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL", userId: string = USER_ID) {
  return { user: { id: userId, role } };
}

function pendingBooking(overrides: Partial<{ id: string; professionalUserId: string; status: string }> = {}) {
  return {
    id: overrides.id ?? BOOKING_ID,
    organizationId: ORG_ID,
    patientId: null,
    professionalId: PROFESSIONAL_ID,
    serviceId: fixtures.SERVICE_ID,
    startTime: new Date("2026-06-19T10:00:00Z"),
    endTime: new Date("2026-06-19T10:30:00Z"),
    status: overrides.status ?? "PENDING",
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

describe("confirmBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.booking.findFirst.mockResolvedValue(pendingBooking());
    prismaMock.booking.update.mockResolvedValue({
      ...pendingBooking(),
      status: "CONFIRMED",
    });
  });

  it("confirms a PENDING booking when called by ADMIN", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BOOKING_ID, updatedAt: UPDATED_AT },
        data: { status: "CONFIRMED" },
      }),
    );
  });

  it("calls revalidatePath('/dashboard/bookings') after a successful confirm", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await confirmBooking({ bookingId: BOOKING_ID });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/bookings");
  });

  it("rejects when the current status is COMPLETED (terminal state)", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      pendingBooking({ status: "COMPLETED" }),
    );
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("transición");
    }
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects when the booking does not exist (returns 404-style error)", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("no encontrado");
    }
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 'No autenticado'", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("returns a Zod error when input is invalid", async () => {
    // No session mock — action returns on Zod parse before getSession.
    // @ts-expect-error testing missing fields at runtime
    const result = await confirmBooking({});

    expect(result.success).toBe(false);
  });

  it("rejects PROFESSIONAL confirming a booking that is not theirs", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      pendingBooking({ professionalUserId: "00000000-0000-4000-8000-000000000099" }),
    );
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("allows PROFESSIONAL to confirm their own booking", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(true);
  });

  it("translates Prisma P2025 (updatedAt mismatch) to a user-facing error", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    prismaMock.booking.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "7.8.0" },
      ),
    );

    const result = await confirmBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("otro usuario");
    }
  });
});
