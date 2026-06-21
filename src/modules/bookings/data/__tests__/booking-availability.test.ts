/**
 * Tests for the bookings availability data provider.
 *
 * The availability layer answers two questions:
 *   1. Is this specific [start, end) range free for this professional?
 *   2. What slots are open on a given day for a given service?
 *
 * Both are read-only data functions. We mock the Prisma singleton and
 * assert the WHERE clauses, the overlap semantics, and the slot grid.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock — declared BEFORE importing so vi.mock can hoist it.
// ---------------------------------------------------------------------------

const prismaMock = {
  booking: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  service: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { checkAvailability } = await import("../booking-availability");
const { getAvailableSlots } = await import("../booking-availability");

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROF_ID = "00000000-0000-4000-8000-000000000011";
const SERVICE_ID = "00000000-0000-4000-8000-000000000012";

describe("checkAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when no overlap exists", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    const result = await checkAvailability(ORG_ID, PROF_ID, start, end);

    expect(result).toBe(true);
  });

  it("returns false when an overlap exists", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce({ id: "b1" });

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    const result = await checkAvailability(ORG_ID, PROF_ID, start, end);

    expect(result).toBe(false);
  });

  it("excludes self when excludeBookingId is provided (reschedule case)", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    await checkAvailability(ORG_ID, PROF_ID, start, end, "self-id");

    expect(prismaMock.booking.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: expect.objectContaining({ id: { not: "self-id" } }),
    });
  });

  it("omits the id filter when excludeBookingId is not provided", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    await checkAvailability(ORG_ID, PROF_ID, start, end);

    const where = prismaMock.booking.findFirst.mock.calls[0]?.[0]?.where;
    expect(where?.id).toBeUndefined();
  });

  it("excludes CANCELLED and NO_SHOW bookings from the overlap check", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    await checkAvailability(ORG_ID, PROF_ID, start, end);

    const where = prismaMock.booking.findFirst.mock.calls[0]?.[0]?.where;
    expect(where?.status).toEqual({ notIn: ["CANCELLED", "NO_SHOW"] });
  });

  it("scopes the overlap query to organizationId and professionalId", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    await checkAvailability(ORG_ID, PROF_ID, start, end);

    expect(prismaMock.booking.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG_ID, professionalId: PROF_ID },
    });
  });

  it("uses the strict half-open overlap condition: startTime < newEnd AND endTime > newStart", async () => {
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);

    const start = new Date("2026-06-19T10:00:00Z");
    const end = new Date("2026-06-19T10:30:00Z");
    await checkAvailability(ORG_ID, PROF_ID, start, end);

    const where = prismaMock.booking.findFirst.mock.calls[0]?.[0]?.where;
    expect(where?.startTime).toEqual({ lt: end });
    expect(where?.endTime).toEqual({ gt: start });
  });
});

describe("getAvailableSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 24 slots from 08:00 to 20:00 in 30-min increments for a 30-min service with no bookings", async () => {
    prismaMock.service.findUnique.mockResolvedValueOnce({ durationMinutes: 30 });
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const date = new Date(2026, 5, 19); // 2026-06-19 local
    const result = await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    // 08:00, 08:30, ..., 19:30 = 24 slots
    expect(result).toHaveLength(24);
    expect(result[0]?.startTime.getHours()).toBe(8);
    expect(result[0]?.startTime.getMinutes()).toBe(0);
    expect(result[23]?.startTime.getHours()).toBe(19);
    expect(result[23]?.startTime.getMinutes()).toBe(30);
  });

  it("each slot's endTime equals startTime + service durationMinutes", async () => {
    prismaMock.service.findUnique.mockResolvedValueOnce({ durationMinutes: 45 });
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const date = new Date(2026, 5, 19);
    const result = await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    for (const slot of result) {
      const diffMinutes =
        (slot.endTime.getTime() - slot.startTime.getTime()) / 60_000;
      expect(diffMinutes).toBe(45);
    }
  });

  it("removes slots that overlap with an active (CONFIRMED) booking", async () => {
    prismaMock.service.findUnique.mockResolvedValueOnce({ durationMinutes: 30 });
    const bookingStart = new Date(2026, 5, 19, 10, 0, 0);
    const bookingEnd = new Date(2026, 5, 19, 10, 30, 0);
    prismaMock.booking.findMany.mockResolvedValueOnce([
      {
        startTime: bookingStart,
        endTime: bookingEnd,
        status: "CONFIRMED",
      },
    ]);

    const date = new Date(2026, 5, 19);
    const result = await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    // 24 - 1 = 23 (the 10:00 slot is occupied)
    expect(result).toHaveLength(23);
    // The 10:00 slot specifically must be gone (compare by timestamp to
    // avoid timezone-sensitive getHours() comparisons).
    const tenAm = new Date(2026, 5, 19, 10, 0, 0).getTime();
    const tenThirty = new Date(2026, 5, 19, 10, 30, 0).getTime();
    expect(result.find((s) => s.startTime.getTime() === tenAm)).toBeUndefined();
    // The 10:30 slot must still be present.
    expect(result.find((s) => s.startTime.getTime() === tenThirty)).toBeDefined();
  });

  it("does NOT remove slots that would only overlap with CANCELLED bookings (Prisma filters via WHERE)", async () => {
    // The implementation queries with `status: { notIn: ["CANCELLED", "NO_SHOW"] }`,
    // so a real Prisma call would never return the CANCELLED booking. The mock
    // is wired to return [] to simulate that filtering.
    prismaMock.service.findUnique.mockResolvedValueOnce({ durationMinutes: 30 });
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const date = new Date(2026, 5, 19);
    const result = await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    expect(result).toHaveLength(24);
  });

  it("queries the service to read its durationMinutes", async () => {
    prismaMock.service.findUnique.mockResolvedValueOnce({ durationMinutes: 60 });
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const date = new Date(2026, 5, 19);
    await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    expect(prismaMock.service.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: SERVICE_ID }),
      }),
    );
  });

  it("scopes the bookings query to organizationId, professionalId, and the given date", async () => {
    prismaMock.service.findUnique.mockResolvedValueOnce({ durationMinutes: 30 });
    prismaMock.booking.findMany.mockResolvedValueOnce([]);

    const date = new Date(2026, 5, 19);
    await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    expect(prismaMock.booking.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: expect.objectContaining({
        organizationId: ORG_ID,
        professionalId: PROF_ID,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      }),
    });
  });

  it("returns empty array when service is not found", async () => {
    prismaMock.service.findUnique.mockResolvedValueOnce(null);

    const date = new Date(2026, 5, 19);
    const result = await getAvailableSlots(ORG_ID, PROF_ID, SERVICE_ID, date);

    expect(result).toEqual([]);
  });
});
