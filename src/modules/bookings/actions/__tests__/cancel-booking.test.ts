/**
 * Tests for the `cancelBooking` Server Action.
 *
 * cancelBooking is a state transition (any non-terminal → CANCELLED) with
 * an optional reason that gets appended to the booking's `notes` field
 * for audit. Like confirm, it uses optimistic locking via `updatedAt`
 * and translates Prisma's P2025 into a user-facing error.
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
const { cancelBooking } = await import("../cancel-booking.action");

// ---------------------------------------------------------------------------
// Test helpers.
// ---------------------------------------------------------------------------

const UPDATED_AT = new Date("2026-06-19T09:00:00Z");

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL", userId: string = USER_ID) {
  return { user: { id: userId, role } };
}

function confirmedBooking(overrides: Partial<{ professionalUserId: string; status: string; notes: string | null }> = {}) {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    patientId: null,
    professionalId: PROFESSIONAL_ID,
    serviceId: fixtures.SERVICE_ID,
    startTime: new Date("2026-06-19T10:00:00Z"),
    endTime: new Date("2026-06-19T10:30:00Z"),
    status: overrides.status ?? "CONFIRMED",
    paymentStatus: "PENDING",
    notes: overrides.notes ?? null,
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

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.booking.findFirst.mockResolvedValue(confirmedBooking());
    prismaMock.booking.update.mockResolvedValue({
      ...confirmedBooking(),
      status: "CANCELLED",
    });
  });

  it("cancels a CONFIRMED booking when called by ADMIN (no reason)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await cancelBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BOOKING_ID, updatedAt: UPDATED_AT },
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });

  it("appends the reason to the existing notes when a reason is provided", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await cancelBooking({
      bookingId: BOOKING_ID,
      reason: "Paciente no puede asistir",
    });

    const updateCall = prismaMock.booking.update.mock.calls[0]?.[0];
    const data = updateCall?.data as { status: string; notes: string };
    expect(data.status).toBe("CANCELLED");
    expect(data.notes).toContain("Paciente no puede asistir");
  });

  it("uses the reason as notes when the booking has no existing notes", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(confirmedBooking({ notes: null }));
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await cancelBooking({
      bookingId: BOOKING_ID,
      reason: "Profesional enfermo",
    });

    const updateCall = prismaMock.booking.update.mock.calls[0]?.[0];
    const data = updateCall?.data as { status: string; notes: string };
    expect(data.notes).toBe("Cancelado: Profesional enfermo");
  });

  it("preserves existing notes and appends the cancel reason with a newline", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ notes: "Primera consulta" }),
    );
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await cancelBooking({
      bookingId: BOOKING_ID,
      reason: "Lluvia",
    });

    const updateCall = prismaMock.booking.update.mock.calls[0]?.[0];
    const data = updateCall?.data as { status: string; notes: string };
    expect(data.notes).toBe("Primera consulta\nCancelado: Lluvia");
  });

  it("calls revalidatePath('/dashboard/bookings') after a successful cancel", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await cancelBooking({ bookingId: BOOKING_ID });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/bookings");
  });

  it("rejects when the booking is already in a terminal state (COMPLETED)", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ status: "COMPLETED" }),
    );
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await cancelBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("transición");
    }
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 'No autenticado'", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await cancelBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("returns a Zod error when input is invalid", async () => {
    // No session mock — action returns on Zod parse before getSession.
    // @ts-expect-error testing missing fields at runtime
    const result = await cancelBooking({});

    expect(result.success).toBe(false);
  });

  it("rejects PROFESSIONAL cancelling a booking that is not theirs", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(
      confirmedBooking({ professionalUserId: "00000000-0000-4000-8000-000000000099" }),
    );
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    const result = await cancelBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("translates Prisma P2025 (updatedAt mismatch) to a user-facing error", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    prismaMock.booking.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "7.8.0" },
      ),
    );

    const result = await cancelBooking({ bookingId: BOOKING_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("otro usuario");
    }
  });
});
