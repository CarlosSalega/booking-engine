/**
 * Tests for the `getCalendarBookings` Server Action.
 *
 * Calendar-specific data loader used by the calendar popover's
 * `onRangeUpdate` callback. The action:
 *   1. Validates the date range with Zod 4.
 *   2. Resolves the session + org + role.
 *   3. Applies RBAC scoping: PROFESSIONAL → `professionalUserId` is
 *      forced to the session user; ADMIN/SECRETARY may pass
 *      `professionalId` (and it's forwarded as-is) or omit it.
 *   4. Calls `getBookings(orgId, { dateRange, professionalUserId? })`.
 *   5. Serializes `startTime`/`endTime` to ISO strings so the
 *      RSC boundary never hands a raw `Date` to the Client component.
 *
 * Mock strategy: same as the rest of the bookings actions — mock
 * `@/lib/prisma`, `next/headers`, `@/core/auth`, and
 * `getOrganizationId`. The data provider `getBookings` is also
 * mocked (the data layer's tests have their own coverage).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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
}));

const { ORG_ID, USER_ID, PROFESSIONAL_USER_ID, PROFESSIONAL_ID, PATIENT_ID, SERVICE_ID } = fixtures;

// ---------------------------------------------------------------------------
// Mock declarations.
// ---------------------------------------------------------------------------

const getBookingsMock = vi.fn();
vi.mock("@/modules/bookings/data/booking-data", () => ({
  getBookings: getBookingsMock,
}));

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

// Import after the mocks are in place.
const { getCalendarBookings } = await import("../get-calendar-bookings.action");

// ---------------------------------------------------------------------------
// Test helpers.
// ---------------------------------------------------------------------------

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL",
  userId: string = USER_ID,
) {
  return { user: { id: userId, role } };
}

const sampleBooking = {
  id: "b1",
  organizationId: ORG_ID,
  patientId: PATIENT_ID,
  professionalId: PROFESSIONAL_ID,
  serviceId: SERVICE_ID,
  startTime: new Date("2026-06-22T13:00:00Z"),
  endTime: new Date("2026-06-22T13:30:00Z"),
  status: "CONFIRMED",
  paymentStatus: "PENDING",
  notes: null,
  createdAt: new Date("2026-06-21T10:00:00Z"),
  updatedAt: new Date("2026-06-21T10:00:00Z"),
  patient: {
    id: PATIENT_ID,
    user: { name: "Juan Pérez", email: "juan@example.com" },
  },
  professional: {
    id: PROFESSIONAL_ID,
    userId: PROFESSIONAL_USER_ID,
    user: { name: "Dr. García" },
  },
  service: {
    id: SERVICE_ID,
    name: "Limpieza Dental",
    price: 3500,
    durationMinutes: 30,
    paymentType: "FULL",
  },
  payments: [],
};

const DATE_RANGE = {
  start: "2026-06-22T00:00:00.000Z",
  end: "2026-06-29T00:00:00.000Z",
};

describe("getCalendarBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBookingsMock.mockResolvedValue({
      bookings: [sampleBooking],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("returns the bookings array from the data layer (ADMIN, no filter)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await getCalendarBookings({ dateRange: DATE_RANGE });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("b1");
  });

  it("does NOT pass professionalUserId to getBookings when ADMIN calls without filter", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await getCalendarBookings({ dateRange: DATE_RANGE });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalUserId?: string };
    expect(filters.professionalUserId).toBeUndefined();
  });

  it("forces professionalUserId to session.user.id for PROFESSIONAL role", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    await getCalendarBookings({ dateRange: DATE_RANGE });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalUserId?: string };
    expect(filters.professionalUserId).toBe(PROFESSIONAL_USER_ID);
  });

  it("PROFESSIONAL cannot override their scoping with a different professionalId", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    await getCalendarBookings({
      dateRange: DATE_RANGE,
      professionalId: "00000000-0000-4000-8000-000000000099",
    });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalUserId?: string; professionalId?: string };
    // Session user id wins; the URL param is ignored for PROFESSIONAL.
    expect(filters.professionalUserId).toBe(PROFESSIONAL_USER_ID);
    expect(filters.professionalId).toBeUndefined();
  });

  it("forwards the URL professionalId to getBookings when ADMIN calls with one", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await getCalendarBookings({
      dateRange: DATE_RANGE,
      professionalId: PROFESSIONAL_ID,
    });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalId?: string };
    expect(filters.professionalId).toBe(PROFESSIONAL_ID);
  });

  it("forwards the URL professionalId to getBookings when SECRETARY calls with one", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    await getCalendarBookings({
      dateRange: DATE_RANGE,
      professionalId: PROFESSIONAL_ID,
    });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalId?: string };
    expect(filters.professionalId).toBe(PROFESSIONAL_ID);
  });

  it("passes the dateRange to getBookings as a { start, end } Date pair", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await getCalendarBookings({ dateRange: DATE_RANGE });

    const call = getBookingsMock.mock.calls[0];
    const orgId = call?.[0] as string;
    const filters = call?.[1] as {
      dateRange?: { start: Date; end: Date };
    };
    expect(orgId).toBe(ORG_ID);
    expect(filters.dateRange).toBeDefined();
    expect(filters.dateRange?.start).toBeInstanceOf(Date);
    expect(filters.dateRange?.end).toBeInstanceOf(Date);
    expect(filters.dateRange?.start.toISOString()).toBe(DATE_RANGE.start);
    expect(filters.dateRange?.end.toISOString()).toBe(DATE_RANGE.end);
  });

  it("serializes startTime and endTime to ISO strings on the response", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await getCalendarBookings({ dateRange: DATE_RANGE });

    const first = result[0]!;
    expect(typeof first.startTime).toBe("string");
    expect(typeof first.endTime).toBe("string");
    expect(first.startTime).toBe("2026-06-22T13:00:00.000Z");
    expect(first.endTime).toBe("2026-06-22T13:30:00.000Z");
  });

  it("returns an empty array when the data layer has no bookings in range", async () => {
    getBookingsMock.mockResolvedValueOnce({
      bookings: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await getCalendarBookings({ dateRange: DATE_RANGE });

    expect(result).toEqual([]);
  });

  it("returns an empty array when the session is missing (defensive — no crash)", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await getCalendarBookings({ dateRange: DATE_RANGE });

    expect(result).toEqual([]);
    expect(getBookingsMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid dateRange shape (missing fields)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    // @ts-expect-error testing missing fields at runtime
    const result = await getCalendarBookings({});

    expect(result).toEqual([]);
    expect(getBookingsMock).not.toHaveBeenCalled();
  });
});
