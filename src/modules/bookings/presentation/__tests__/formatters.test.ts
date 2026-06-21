/**
 * Tests for the bookings presentation formatters.
 *
 * These are PURE functions (no React, no Next.js, no Prisma). They live
 * in the presentation layer because they format domain data for display
 * in the UI. The tests are organized by formatter; each behavior
 * gets at least one happy path and one edge case.
 *
 * Locale: Argentinian Spanish (es-AR). Currency: ARS. The formatters
 * use `Intl` APIs which are deterministic in the runtime we ship, so
 * no mocks are needed.
 */

import { describe, expect, it } from "vitest";

import { PaymentStatus, type PaymentStatusType } from "@/modules/services/domain";

import { BookingStatus, type BookingStatusType } from "@/modules/bookings/domain/booking";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

import {
  BOOKING_STATUS_LABEL,
  formatBookingDate,
  formatBookingTime,
  formatCurrency,
  formatPaymentStatus,
  formatPaymentType,
  getBookingStatusLabel,
  getPatientDisplayName,
  GUEST_NOTES_PREFIX,
} from "@/modules/bookings/presentation/formatters";

// ---------------------------------------------------------------------------
// Test data — fixed dates for deterministic Intl output across environments.
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const PROF_USER_ID = "00000000-0000-4000-8000-000000000010";
const PROF_ID = "00000000-0000-4000-8000-000000000011";
const SERVICE_ID = "00000000-0000-4000-8000-000000000012";
const PATIENT_ID = "00000000-0000-4000-8000-000000000013";

function makeBooking(overrides: Partial<EnrichedBooking> = {}): EnrichedBooking {
  return {
    id: "b1",
    organizationId: ORG_ID,
    patientId: PATIENT_ID,
    professionalId: PROF_ID,
    serviceId: SERVICE_ID,
    startTime: new Date("2026-06-19T10:00:00Z"),
    endTime: new Date("2026-06-19T10:30:00Z"),
    status: BookingStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PENDING,
    notes: null,
    createdAt: new Date("2026-06-18T09:00:00Z"),
    updatedAt: new Date("2026-06-18T09:00:00Z"),
    patient: {
      id: PATIENT_ID,
      user: { name: "Juan Pérez", email: "juan@example.com" },
    },
    professional: {
      id: PROF_ID,
      userId: PROF_USER_ID,
      user: { name: "Dr. García" },
    },
    service: {
      id: SERVICE_ID,
      name: "Limpieza Dental",
      durationMinutes: 30,
      price: 42500,
      paymentType: "FULL",
    },
    payments: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatBookingDate — es-AR, day/month/year
// ---------------------------------------------------------------------------

describe("formatBookingDate", () => {
  it("formats a Date as es-AR short date (19/6/2026 or 19/06/2026)", () => {
    // Intl.DateTimeFormat es-AR yields "19/6/26" (numeric, 2-digit year) or
    // "19/06/2026" (2-digit day, 2-digit month, numeric year). Both are
    // acceptable for Argentinian Spanish — assert the parts are present
    // rather than the exact string.
    const date = new Date("2026-06-19T15:30:00Z");
    const formatted = formatBookingDate(date);
    expect(formatted).toMatch(/19/);
    expect(formatted).toMatch(/06|6/);
    expect(formatted).toMatch(/2026|26/);
  });

  it("formats a different date and produces a different string", () => {
    const a = formatBookingDate(new Date("2026-01-05T10:00:00Z"));
    const b = formatBookingDate(new Date("2026-12-25T10:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("returns a non-empty string for any valid Date", () => {
    const formatted = formatBookingDate(new Date("2026-06-19T10:00:00Z"));
    expect(formatted.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// formatBookingTime — HH:MM in 24h format
// ---------------------------------------------------------------------------

describe("formatBookingTime", () => {
  // The formatter renders the Date in the runtime's local timezone. The
  // test environment runs in America/Argentina/Buenos_Aires (UTC-3), so
  // we compute expectations from the local clock rather than the UTC
  // source. Production (Argentina) and CI share this timezone.
  function localHHMM(date: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  it("formats a morning Date as HH:MM (10:00 UTC → 07:00 AR)", () => {
    const date = new Date("2026-06-19T10:00:00Z");
    expect(formatBookingTime(date)).toBe(localHHMM(date));
  });

  it("formats an afternoon Date as HH:MM (14:30 UTC → 11:30 AR)", () => {
    const date = new Date("2026-06-19T14:30:00Z");
    expect(formatBookingTime(date)).toBe(localHHMM(date));
  });

  it("formats a midnight Date as HH:MM (00:00 UTC → 21:00 AR)", () => {
    const date = new Date("2026-06-19T00:00:00Z");
    expect(formatBookingTime(date)).toBe(localHHMM(date));
  });

  it("matches the HH:MM regex shape (digits + colon)", () => {
    const formatted = formatBookingTime(new Date("2026-06-19T10:00:00Z"));
    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency — es-AR, ARS currency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats 42500 as an ARS currency string", () => {
    const formatted = formatCurrency(42500);
    // Intl es-AR ARS yields "$42.500" or "$42.500,00" depending on
    // maximumFractionDigits. We requested 0 in the dashboard helper;
    // here we use 2 (the more conservative default) and accept either.
    expect(formatted).toMatch(/42\.500/);
    expect(formatted).toMatch(/\$\s?42\.500/);
  });

  it("formats 0 as a currency string", () => {
    const formatted = formatCurrency(0);
    expect(formatted).toMatch(/\$|ARS/);
    expect(formatted).toMatch(/0/);
  });

  it("formats large numbers with thousands separators", () => {
    const formatted = formatCurrency(1_500_000);
    // 1.500.000 (es-AR uses . as thousands separator)
    expect(formatted).toMatch(/1\.500\.000/);
  });
});

// ---------------------------------------------------------------------------
// BOOKING_STATUS_LABEL + getBookingStatusLabel
// ---------------------------------------------------------------------------

describe("BOOKING_STATUS_LABEL", () => {
  it("maps all 7 BookingStatus values to Argentinian Spanish labels", () => {
    expect(BOOKING_STATUS_LABEL[BookingStatus.PENDING]).toBe("Pendiente");
    expect(BOOKING_STATUS_LABEL[BookingStatus.CONFIRMED]).toBe("Confirmada");
    expect(BOOKING_STATUS_LABEL[BookingStatus.CANCELLED]).toBe("Cancelada");
    expect(BOOKING_STATUS_LABEL[BookingStatus.RESCHEDULED]).toBe(
      "Reprogramada",
    );
    expect(BOOKING_STATUS_LABEL[BookingStatus.COMPLETED]).toBe("Completada");
    expect(BOOKING_STATUS_LABEL[BookingStatus.NO_SHOW]).toBe("No asistió");
    expect(BOOKING_STATUS_LABEL[BookingStatus.AWAITING_PAYMENT]).toBe(
      "Esperando pago",
    );
  });

  it("exposes a label for every BookingStatusType (exhaustive coverage)", () => {
    const allStatuses: BookingStatusType[] = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
      BookingStatus.AWAITING_PAYMENT,
    ];
    for (const status of allStatuses) {
      expect(BOOKING_STATUS_LABEL[status]).toBeTruthy();
      expect(BOOKING_STATUS_LABEL[status].length).toBeGreaterThan(0);
    }
  });
});

describe("getBookingStatusLabel", () => {
  it("returns the Argentinian Spanish label for a known status", () => {
    expect(getBookingStatusLabel(BookingStatus.CONFIRMED)).toBe("Confirmada");
    expect(getBookingStatusLabel(BookingStatus.NO_SHOW)).toBe("No asistió");
  });

  it("returns the input string when the status is unknown (graceful fallback)", () => {
    expect(getBookingStatusLabel("UNKNOWN" as BookingStatusType)).toBe(
      "UNKNOWN",
    );
  });
});

// ---------------------------------------------------------------------------
// formatPaymentStatus — payment status badge labels
// ---------------------------------------------------------------------------

describe("formatPaymentStatus", () => {
  it("maps every PaymentStatus to an Argentinian Spanish label", () => {
    const cases: Array<[PaymentStatusType, string]> = [
      [PaymentStatus.PAID, "Pagado"],
      [PaymentStatus.PENDING, "Pendiente"],
      [PaymentStatus.FAILED, "Fallido"],
      [PaymentStatus.REFUNDED, "Reembolsado"],
      [PaymentStatus.PARTIALLY_REFUNDED, "Parcial"],
    ];
    for (const [status, expected] of cases) {
      expect(formatPaymentStatus(status)).toBe(expected);
    }
  });

  it("returns the raw status for unknown payment statuses", () => {
    expect(formatPaymentStatus("GHOST" as PaymentStatusType)).toBe("GHOST");
  });
});

// ---------------------------------------------------------------------------
// formatPaymentType — service payment type label
// ---------------------------------------------------------------------------

describe("formatPaymentType", () => {
  it("labels FULL as 'Pago completo'", () => {
    expect(formatPaymentType("FULL")).toBe("Pago completo");
  });

  it("labels DEPOSIT as 'Seña'", () => {
    expect(formatPaymentType("DEPOSIT")).toBe("Seña");
  });

  it("labels NONE as 'Sin pago'", () => {
    expect(formatPaymentType("NONE")).toBe("Sin pago");
  });

  it("returns the raw value for unknown payment types", () => {
    expect(formatPaymentType("GOLD" as never)).toBe("GOLD");
  });
});

// ---------------------------------------------------------------------------
// getPatientDisplayName — handles guest bookings
// ---------------------------------------------------------------------------

describe("getPatientDisplayName", () => {
  it("returns the patient user.name when the booking has a patient", () => {
    const booking = makeBooking();
    expect(getPatientDisplayName(booking)).toBe("Juan Pérez");
  });

  it("returns 'Invitado' when the booking has no patient (null)", () => {
    const booking = makeBooking({ patient: null, patientId: null });
    expect(getPatientDisplayName(booking)).toBe("Invitado");
  });

  it("extracts the guest name from `notes` when the booking is a guest booking", () => {
    const booking = makeBooking({
      patient: null,
      patientId: null,
      notes: `${GUEST_NOTES_PREFIX} María Gómez | Tel: 351-9876543 | Email: maria@email.com`,
    });
    expect(getPatientDisplayName(booking)).toBe("Invitado: María Gómez");
  });

  it("falls back to 'Invitado' when notes does NOT start with the guest prefix", () => {
    const booking = makeBooking({
      patient: null,
      patientId: null,
      notes: "Patient requested morning slot",
    });
    expect(getPatientDisplayName(booking)).toBe("Invitado");
  });

  it("falls back to 'Invitado' when notes is null and patient is null", () => {
    const booking = makeBooking({ patient: null, patientId: null, notes: null });
    expect(getPatientDisplayName(booking)).toBe("Invitado");
  });
});
