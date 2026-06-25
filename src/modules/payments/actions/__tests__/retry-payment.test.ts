/**
 * Tests for the `retryPayment` Server Action.
 *
 * Mirrors the `changePatientStatus` test strategy. The action:
 *   1. Validates `{ paymentId }` with Zod 4 (UUID, es-AR error message)
 *   2. Enforces auth + RBAC (PROFESSIONAL/PATIENT rejected)
 *   3. Resolves `organizationId` → verifies the payment exists → calls
 *      the data-layer `retryPayment` (which enforces `canRetry()`)
 *   4. Revalidates `/dashboard/payments` + `/dashboard/payments/[id]`
 *   5. Returns `{ success: true, data: EnrichedPayment }`
 *
 * Mocked boundaries: `next/headers`, `@/core/auth`, `getOrganizationId`,
 * `next/cache`, and the data layer (`getPaymentById` + `retryPayment`
 * + error class exports).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "00000000-0000-4000-8000-0000000000aa";
const PAYMENT_ID = "00000000-0000-4000-8000-0000000000c1";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const getSessionMock = vi.fn();
vi.mock("@/core/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const getOrganizationIdMock = vi.fn().mockResolvedValue(ORG_ID);
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getPaymentByIdMock = vi.fn();
const retryPaymentDataMock = vi.fn();
vi.mock("@/modules/payments/data/payment-data", () => ({
  getPaymentById: getPaymentByIdMock,
  retryPayment: retryPaymentDataMock,
  // Re-export the error classes so the action can `instanceof` them.
  PaymentNotFoundError: class PaymentNotFoundError extends Error {
    constructor(message = "Payment not found") {
      super(message);
      this.name = "PaymentNotFoundError";
    }
  },
  RetryNotAllowedError: class RetryNotAllowedError extends Error {
    constructor(message = "Payment is not retryable") {
      super(message);
      this.name = "RetryNotAllowedError";
    }
  },
}));

// Imports after mocks are in place — the dynamic-await defers the
// resolution until after `vi.mock` has hoisted the module-level mocks.
const { retryPayment } = await import("../retry-payment.action");
const { RetryNotAllowedError } = await import(
  "@/modules/payments/data/payment-data"
);

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL" | "PATIENT",
) {
  return { user: { id: ADMIN_USER_ID, role } };
}

const enrichedPayment = {
  id: PAYMENT_ID,
  organizationId: ORG_ID,
  bookingId: "00000000-0000-4000-8000-0000000000b1",
  provider: "MERCADOPAGO" as const,
  status: "PENDING" as const,
  amount: 5000,
  retryCount: 1,
  createdAt: new Date("2026-06-20T10:00:00Z"),
  updatedAt: new Date("2026-06-25T14:00:00Z"),
  bookingStartTime: new Date("2026-06-25T14:00:00Z"),
  patientName: "María González",
  professionalName: "Dr. García",
  serviceName: "Consulta general",
  servicePaymentType: "FULL" as const,
  businessStatus: "PENDING" as const,
};

describe("retryPayment action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrganizationIdMock.mockResolvedValue(ORG_ID);
  });

  // Auth + RBAC — all three pre-data branches must short-circuit with
  // "No autorizado" and never touch getOrganizationId / the data layer.
  it.each([
    ["unauthenticated", null],
    ["PROFESSIONAL role", sessionFor("PROFESSIONAL")],
    ["PATIENT role", sessionFor("PATIENT")],
  ])("rejects %s with 'No autorizado'", async (_label, session) => {
    getSessionMock.mockResolvedValueOnce(session);
    const result = await retryPayment({ paymentId: PAYMENT_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("No autorizado");
    expect(getOrganizationIdMock).not.toHaveBeenCalled();
    expect(getPaymentByIdMock).not.toHaveBeenCalled();
    expect(retryPaymentDataMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid UUID with 'ID de pago inválido' (Zod first)", async () => {
    const result = await retryPayment({ paymentId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("ID de pago inválido");
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("returns 'Pago no encontrado' when getPaymentById returns null", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPaymentByIdMock.mockResolvedValueOnce(null);
    const result = await retryPayment({ paymentId: PAYMENT_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Pago no encontrado");
    expect(retryPaymentDataMock).not.toHaveBeenCalled();
  });

  it("scopes getPaymentById to the resolved organizationId", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPaymentByIdMock.mockResolvedValueOnce(null);
    await retryPayment({ paymentId: PAYMENT_ID });
    expect(getPaymentByIdMock).toHaveBeenCalledWith(ORG_ID, PAYMENT_ID);
  });

  it("returns 'No se puede reintentar este pago' when the data layer throws RetryNotAllowedError", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPaymentByIdMock.mockResolvedValueOnce(enrichedPayment);
    retryPaymentDataMock.mockRejectedValueOnce(
      new RetryNotAllowedError("Payment is not retryable"),
    );
    const result = await retryPayment({ paymentId: PAYMENT_ID });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No se puede reintentar este pago");
    }
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns the enriched payment and revalidates both payments paths (ADMIN)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPaymentByIdMock.mockResolvedValueOnce(enrichedPayment);
    retryPaymentDataMock.mockResolvedValueOnce(enrichedPayment);
    const result = await retryPayment({ paymentId: PAYMENT_ID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(PAYMENT_ID);
      expect(result.data.status).toBe("PENDING");
      expect(result.data.patientName).toBe("María González");
    }
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/payments");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dashboard/payments/[id]",
      "page",
    );
  });

  it("also allows SECRETARY role to retry a payment", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));
    getPaymentByIdMock.mockResolvedValueOnce(enrichedPayment);
    retryPaymentDataMock.mockResolvedValueOnce(enrichedPayment);
    const result = await retryPayment({ paymentId: PAYMENT_ID });
    expect(result.success).toBe(true);
  });

  it("calls the data-layer retryPayment with the resolved orgId and parsed paymentId", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));
    getPaymentByIdMock.mockResolvedValueOnce(enrichedPayment);
    retryPaymentDataMock.mockResolvedValueOnce(enrichedPayment);
    await retryPayment({ paymentId: PAYMENT_ID });
    expect(retryPaymentDataMock).toHaveBeenCalledWith(ORG_ID, PAYMENT_ID);
  });
});
