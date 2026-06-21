/**
 * Tests for the `createBooking` Server Action.
 *
 * Mocking strategy: the action depends on five boundaries, and we mock
 * each one explicitly so the test stays deterministic and fast.
 *
 *   1. `@/lib/prisma`                 — data layer (including $transaction)
 *   2. `next/headers`                 — `headers()` for session lookup
 *   3. `@/core/auth`                  — `auth.api.getSession(...)`
 *   4. `@/modules/dashboard/data/...` — `getOrganizationId()`
 *   5. `next/cache`                   — `revalidatePath()`
 *
 * The Prisma mock supports `$transaction(async (tx) => cb(tx))` by
 * passing the same transaction mock object back to the callback.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Test fixtures — declared with vi.hoisted so the mock factories can
// reference them (vi.mock is hoisted to the top of the file, BEFORE
// ordinary `const` initializers run).
// ---------------------------------------------------------------------------

const fixtures = vi.hoisted(() => ({
  ORG_ID: "00000000-0000-4000-8000-000000000001",
  USER_ID: "00000000-0000-4000-8000-000000000002",
  PROFESSIONAL_USER_ID: "00000000-0000-4000-8000-000000000010",
  PROFESSIONAL_ID: "00000000-0000-4000-8000-000000000011",
  OTHER_PROFESSIONAL_ID: "00000000-0000-4000-8000-000000000015",
  SERVICE_ID: "00000000-0000-4000-8000-000000000012",
  PATIENT_ID: "00000000-0000-4000-8000-000000000013",
  BOOKING_ID: "00000000-0000-4000-8000-000000000020",
  START: new Date("2026-06-19T10:00:00Z"),
  END: new Date("2026-06-19T10:30:00Z"),
}));

const { ORG_ID, USER_ID, PROFESSIONAL_USER_ID, PROFESSIONAL_ID, OTHER_PROFESSIONAL_ID, SERVICE_ID, PATIENT_ID, BOOKING_ID, START, END } = fixtures;

// ---------------------------------------------------------------------------
// Mock declarations — BEFORE the import of the action under test.
// ---------------------------------------------------------------------------

const txMock = vi.hoisted(() => ({
  booking: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(
    async (cbOrArray: unknown) =>
      // The action uses the interactive form: $transaction(async (tx) => ...).
      // We call the callback with `txMock` so the action reads/writes through it.
      typeof cbOrArray === "function" ? (cbOrArray as (tx: typeof txMock) => unknown)(txMock) : cbOrArray,
  ),
  service: {
    findUnique: vi.fn(),
  },
  professional: {
    findFirst: vi.fn(),
  },
  booking: {
    findFirst: vi.fn(),
    create: vi.fn(),
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
const { createBooking } = await import("../create-booking.action");

// ---------------------------------------------------------------------------
// Test fixtures.
// ---------------------------------------------------------------------------

function sessionFor(role: "ADMIN" | "SECRETARY" | "PROFESSIONAL", userId: string = USER_ID) {
  return { user: { id: userId, role } };
}

const validService = {
  id: SERVICE_ID,
  organizationId: ORG_ID,
  status: "ACTIVE",
  durationMinutes: 30,
};

const professionalForUser = {
  id: PROFESSIONAL_ID,
  organizationId: ORG_ID,
  userId: PROFESSIONAL_USER_ID,
};

const createdBooking = {
  id: BOOKING_ID,
  organizationId: ORG_ID,
  patientId: null,
  professionalId: PROFESSIONAL_ID,
  serviceId: SERVICE_ID,
  startTime: START,
  endTime: END,
  status: "PENDING",
  paymentStatus: "PENDING",
  notes: null,
  createdAt: new Date("2026-06-19T09:00:00Z"),
  updatedAt: new Date("2026-06-19T09:00:00Z"),
};

// ---------------------------------------------------------------------------
// Test suite.
// ---------------------------------------------------------------------------

describe("createBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.service.findUnique.mockResolvedValue(validService);
    prismaMock.professional.findFirst.mockResolvedValue(professionalForUser);
    txMock.booking.findFirst.mockResolvedValue(null); // no overlap by default
    txMock.booking.create.mockResolvedValue(createdBooking);
  });

  it("creates a PENDING booking with a patient when input is valid (ADMIN role)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await createBooking({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(BOOKING_ID);
      expect(result.data.status).toBe("PENDING");
    }
  });

  it("creates a guest booking with patientId null and stores guest info in notes", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    const result = await createBooking({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      guestName: "Juan Pérez",
      guestPhone: "351-1234567",
      guestEmail: "juan@email.com",
    });

    expect(result.success).toBe(true);
    // The transaction's booking.create should receive patientId: null and a
    // notes string containing the guest contact info.
    expect(txMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: null,
          professionalId: PROFESSIONAL_ID,
          serviceId: SERVICE_ID,
          status: "PENDING",
        }),
      }),
    );
    const dataArg = txMock.booking.create.mock.calls[0]?.[0]?.data as { notes: string };
    expect(dataArg.notes).toContain("Juan Pérez");
    expect(dataArg.notes).toContain("351-1234567");
  });

  it("returns the slot-occupied error when an overlap exists in the transaction", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    txMock.booking.findFirst.mockResolvedValueOnce({ id: "other-booking" });

    const result = await createBooking({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toContain("ocupado");
    }
    // And no insert should happen.
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects when the service does not exist or is not ACTIVE", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    prismaMock.service.findUnique.mockResolvedValueOnce(null);

    const result = await createBooking({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(result.success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 'No autenticado'", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createBooking({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("returns a Zod error when input is invalid (missing required fields)", async () => {
    // No session mock needed: the action returns on Zod parse before
    // getSession is called. Queueing a value here would leak into the
    // next test (mockResolvedValueOnce queues persist across tests).
    // @ts-expect-error testing missing fields at runtime
    const result = await createBooking({});

    expect(result.success).toBe(false);
  });

  it("rejects PROFESSIONAL creating a booking for a different professional", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );
    // professionalForUser is the OWN professional; the request targets a different one.
    prismaMock.professional.findFirst.mockResolvedValueOnce(professionalForUser);

    const result = await createBooking({
      professionalId: OTHER_PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autorizado");
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("allows PROFESSIONAL to create a booking for themselves", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );
    prismaMock.professional.findFirst.mockResolvedValueOnce(professionalForUser);

    const result = await createBooking({
      professionalId: PROFESSIONAL_ID, // matches the professionalForUser
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(result.success).toBe(true);
  });

  it("calls revalidatePath('/dashboard/bookings') after a successful insert", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await createBooking({
      professionalId: PROFESSIONAL_ID,
      serviceId: SERVICE_ID,
      startTime: START,
      patientId: PATIENT_ID,
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/bookings");
  });
});
