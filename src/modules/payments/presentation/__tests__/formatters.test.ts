/**
 * Tests for the payments presentation formatters.
 *
 * Pure functions, no React or DOM. The formatters are the single
 * source of truth for Argentinian Spanish labels and ARS currency
 * formatting in the payments module, so we exhaustively cover:
 *
 * - `PAYMENT_STATUS_LABEL` — all 5 `ProviderPaymentStatus` values.
 * - `getPaymentStatusLabel` — function form + unknown-status fallback.
 * - `formatCurrency` — positive, zero, negative, and large amounts.
 *
 * Locale: Argentinian Spanish (es-AR). Currency: ARS. The formatters
 * use `Intl` APIs which are deterministic in the runtime we ship, so
 * no mocks are needed.
 *
 * Spec scenarios covered (from
 * `openspec/changes/payments/specs/payments-presentation/spec.md`):
 * - "Status labels in es-AR" — PENDING→"Pendiente", APPROVED→"Aprobado",
 *   REJECTED→"Rechazado".
 * - "formatCurrency outputs ARS format" — 5000→"$ 5.000,00",
 *   2500.5→"$ 2.500,50".
 */

import { describe, expect, it } from "vitest";

import {
  ProviderPaymentStatus,
  type ProviderPaymentStatusType,
} from "@/modules/payments/domain/payment";

import {
  formatCurrency,
  getPaymentStatusLabel,
  PAYMENT_STATUS_LABEL,
} from "@/modules/payments/presentation/formatters";

// ---------------------------------------------------------------------------
// PAYMENT_STATUS_LABEL — exhaustive coverage
// ---------------------------------------------------------------------------

describe("PAYMENT_STATUS_LABEL", () => {
  it("maps PENDING → 'Pendiente'", () => {
    expect(PAYMENT_STATUS_LABEL[ProviderPaymentStatus.PENDING]).toBe(
      "Pendiente",
    );
  });

  it("maps APPROVED → 'Aprobado'", () => {
    expect(PAYMENT_STATUS_LABEL[ProviderPaymentStatus.APPROVED]).toBe(
      "Aprobado",
    );
  });

  it("maps REJECTED → 'Rechazado'", () => {
    expect(PAYMENT_STATUS_LABEL[ProviderPaymentStatus.REJECTED]).toBe(
      "Rechazado",
    );
  });

  it("maps CANCELLED → 'Cancelado'", () => {
    expect(PAYMENT_STATUS_LABEL[ProviderPaymentStatus.CANCELLED]).toBe(
      "Cancelado",
    );
  });

  it("maps IN_PROCESS → 'En proceso'", () => {
    expect(PAYMENT_STATUS_LABEL[ProviderPaymentStatus.IN_PROCESS]).toBe(
      "En proceso",
    );
  });

  it("covers all 5 ProviderPaymentStatus values (exhaustive)", () => {
    const all = Object.values(ProviderPaymentStatus);
    expect(all).toHaveLength(5);
    for (const status of all) {
      expect(PAYMENT_STATUS_LABEL[status]).toBeTruthy();
      expect(PAYMENT_STATUS_LABEL[status].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getPaymentStatusLabel — function form
// ---------------------------------------------------------------------------

describe("getPaymentStatusLabel", () => {
  it("returns 'Pendiente' for PENDING", () => {
    expect(getPaymentStatusLabel(ProviderPaymentStatus.PENDING)).toBe(
      "Pendiente",
    );
  });

  it("returns 'Aprobado' for APPROVED", () => {
    expect(getPaymentStatusLabel(ProviderPaymentStatus.APPROVED)).toBe(
      "Aprobado",
    );
  });

  it("returns 'Rechazado' for REJECTED", () => {
    expect(getPaymentStatusLabel(ProviderPaymentStatus.REJECTED)).toBe(
      "Rechazado",
    );
  });

  it("returns 'Cancelado' for CANCELLED", () => {
    expect(getPaymentStatusLabel(ProviderPaymentStatus.CANCELLED)).toBe(
      "Cancelado",
    );
  });

  it("returns 'En proceso' for IN_PROCESS", () => {
    expect(getPaymentStatusLabel(ProviderPaymentStatus.IN_PROCESS)).toBe(
      "En proceso",
    );
  });

  it("returns 'Desconocido' for an unknown status (defensive fallback)", () => {
    expect(
      getPaymentStatusLabel(
        "UNKNOWN" as unknown as ProviderPaymentStatusType,
      ),
    ).toBe("Desconocido");
  });
});

// ---------------------------------------------------------------------------
// formatCurrency — es-AR, ARS currency
//
// `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })`
// uses a non-breaking space (U+00A0) between the symbol and the number.
// We assert the rendered parts (symbol, integer separator, decimal)
// rather than the literal byte sequence so the test is robust to
// Intl behavior changes across runtimes.
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats 5000 as '$ 5.000,00' (es-AR, ARS)", () => {
    const formatted = formatCurrency(5000);
    expect(formatted).toContain("$");
    expect(formatted).toContain("5.000");
    expect(formatted).toContain(",00");
  });

  it("formats 2500.5 as '$ 2.500,50'", () => {
    const formatted = formatCurrency(2500.5);
    expect(formatted).toContain("$");
    expect(formatted).toContain("2.500");
    expect(formatted).toContain(",50");
  });

  it("formats 0 as '$ 0,00' (zero amount)", () => {
    const formatted = formatCurrency(0);
    expect(formatted).toContain("$");
    expect(formatted).toContain("0");
    expect(formatted).toContain(",00");
  });

  it("formats negative amounts with a leading '-' (debt / refund)", () => {
    const formatted = formatCurrency(-1500);
    expect(formatted).toMatch(/-/);
    expect(formatted).toContain("1.500");
    expect(formatted).toContain(",00");
  });

  it("formats large amounts with thousands separators (1.500.000)", () => {
    const formatted = formatCurrency(1_500_000);
    expect(formatted).toContain("$");
    expect(formatted).toContain("1.500.000");
    expect(formatted).toContain(",00");
  });
});
