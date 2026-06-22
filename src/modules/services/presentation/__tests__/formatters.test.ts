/**
 * Tests for the services module's es-AR presentation formatters.
 *
 * Mirrors the `bookings/presentation/formatters.test.ts` and
 * `patients/presentation/formatters.test.ts` patterns: pure
 * function tests, no React or DOM. The formatters are the single
 * source of truth for Argentinian Spanish labels and currency
 * formatting, so we exhaustively cover all enum values and the
 * edge cases (zero, decimals, large amounts).
 *
 * Spec scenarios covered (from
 * `openspec/changes/services/specs/services-domain/spec.md`):
 * - `services-list` — "Activo" (green) / "Inactivo" (gray) badges.
 * - `services-detail` — "Pago completo" / "Seña" / "Sin costo" payment labels.
 * - `services-detail` — `formatPrice` returns "$ 2.000,00" (es-AR).
 */

import { describe, expect, it } from "vitest";

import { PaymentType, ServiceStatus } from "@/modules/services/domain/service";

import {
  formatPrice,
  getPaymentTypeLabel,
  getServiceStatusLabel,
  PAYMENT_TYPE_LABEL,
  SERVICE_STATUS_LABEL,
} from "@/modules/services/presentation/formatters";

// ---------------------------------------------------------------------------
// SERVICE_STATUS_LABEL — exhaustive coverage
// ---------------------------------------------------------------------------

describe("SERVICE_STATUS_LABEL", () => {
  it("maps ACTIVE → 'Activo' (Argentinian Spanish)", () => {
    expect(SERVICE_STATUS_LABEL[ServiceStatus.ACTIVE]).toBe("Activo");
  });

  it("maps INACTIVE → 'Inactivo'", () => {
    expect(SERVICE_STATUS_LABEL[ServiceStatus.INACTIVE]).toBe("Inactivo");
  });

  it("covers all 2 ServiceStatus values (exhaustive)", () => {
    const all = Object.values(ServiceStatus);
    for (const status of all) {
      expect(SERVICE_STATUS_LABEL[status]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// getServiceStatusLabel — function form
// ---------------------------------------------------------------------------

describe("getServiceStatusLabel", () => {
  it("returns 'Activo' for ACTIVE", () => {
    expect(getServiceStatusLabel(ServiceStatus.ACTIVE)).toBe("Activo");
  });

  it("returns 'Inactivo' for INACTIVE", () => {
    expect(getServiceStatusLabel(ServiceStatus.INACTIVE)).toBe("Inactivo");
  });
});

// ---------------------------------------------------------------------------
// PAYMENT_TYPE_LABEL — exhaustive coverage
// ---------------------------------------------------------------------------

describe("PAYMENT_TYPE_LABEL", () => {
  it("maps NONE → 'Sin costo'", () => {
    expect(PAYMENT_TYPE_LABEL[PaymentType.NONE]).toBe("Sin costo");
  });

  it("maps DEPOSIT → 'Seña'", () => {
    expect(PAYMENT_TYPE_LABEL[PaymentType.DEPOSIT]).toBe("Seña");
  });

  it("maps FULL → 'Pago completo'", () => {
    expect(PAYMENT_TYPE_LABEL[PaymentType.FULL]).toBe("Pago completo");
  });

  it("covers all 3 PaymentType values (exhaustive)", () => {
    const all = Object.values(PaymentType);
    for (const type of all) {
      expect(PAYMENT_TYPE_LABEL[type]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// getPaymentTypeLabel — function form
// ---------------------------------------------------------------------------

describe("getPaymentTypeLabel", () => {
  it("returns 'Sin costo' for NONE", () => {
    expect(getPaymentTypeLabel(PaymentType.NONE)).toBe("Sin costo");
  });

  it("returns 'Seña' for DEPOSIT", () => {
    expect(getPaymentTypeLabel(PaymentType.DEPOSIT)).toBe("Seña");
  });

  it("returns 'Pago completo' for FULL", () => {
    expect(getPaymentTypeLabel(PaymentType.FULL)).toBe("Pago completo");
  });
});

// ---------------------------------------------------------------------------
// formatPrice — es-AR currency formatting (Intl.NumberFormat ARS)
// ---------------------------------------------------------------------------

describe("formatPrice", () => {
  it("formats 2000 with thousands separator and 2 fraction digits (es-AR)", () => {
    // Intl es-AR ARS yields "$ 2.000,00" or "$\u00A02.000,00"
    // (non-breaking space) depending on the runtime ICU data — match
    // both, mirroring the bookings `formatCurrency` test pattern.
    const formatted = formatPrice(2000);
    expect(formatted).toMatch(/2\.000/);
    expect(formatted).toMatch(/,\d{2}$/);
    expect(formatted).toMatch(/^\$\s?2\.000/);
  });

  it("formats 0 with 2 fraction digits", () => {
    const formatted = formatPrice(0);
    expect(formatted).toMatch(/0/);
    expect(formatted).toMatch(/,\d{2}$/);
  });

  it("formats 1 with 2 fraction digits", () => {
    const formatted = formatPrice(1);
    expect(formatted).toMatch(/1/);
    expect(formatted).toMatch(/,\d{2}$/);
  });

  it("formats 42500.5 and preserves the cents", () => {
    const formatted = formatPrice(42500.5);
    expect(formatted).toMatch(/42\.500/);
    // Cents suffix MUST be the actual cents, not zero-padded rounding.
    expect(formatted).toMatch(/,50$/);
  });

  it("formats 1,000,000 with es-AR thousands separators (1.000.000)", () => {
    const formatted = formatPrice(1000000);
    expect(formatted).toMatch(/1\.000\.000/);
  });

  it("uses ARS currency symbol and es-AR locale (not en-US)", () => {
    // Sanity check: result must start with "$" and use a comma as
    // decimal separator. This guards against a regression where the
    // locale accidentally flips to en-US (which would render
    // "$2,000.00" with comma as thousands separator and period as
    // decimal).
    const result = formatPrice(2000);
    expect(result).toMatch(/^\$/);
    // The last 2 digits after the comma are the cents: ",00" must be
    // the suffix. In en-US that would be ".00" instead.
    expect(result).toMatch(/,\d{2}$/);
    // Must not end in a period + 2 digits (en-US pattern).
    expect(result).not.toMatch(/\.\d{2}$/);
  });
});
