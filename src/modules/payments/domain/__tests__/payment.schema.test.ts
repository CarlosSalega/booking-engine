import { describe, it, expect } from "vitest";

import { PaymentProvider, ProviderPaymentStatus } from "../payment";
import { paymentSchema, providerPaymentSchema } from "../payment.schema";

// ---------------------------------------------------------------------------
// providerPaymentSchema
// ---------------------------------------------------------------------------

describe("providerPaymentSchema", () => {
  it("accepts a valid provider payment payload", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: 2000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.data.provider).toBe(PaymentProvider.MERCADOPAGO);
      expect(result.data.status).toBe(ProviderPaymentStatus.PENDING);
      expect(result.data.amount).toBe(2000);
      expect(result.data.retryCount).toBeUndefined();
    }
  });

  it("rejects a missing id", () => {
    const result = providerPaymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts an explicit retryCount >= 0", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.REJECTED,
      amount: 100,
      retryCount: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retryCount).toBe(2);
    }
  });

  it("accepts an optional parentPaymentId", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.APPROVED,
      amount: 100,
      parentPaymentId: "550e8400-e29b-41d4-a716-446655440099",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentPaymentId).toBe(
        "550e8400-e29b-41d4-a716-446655440099",
      );
    }
  });

  it("rejects an unknown provider", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: "STRIPE",
      status: ProviderPaymentStatus.PENDING,
      amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown provider status", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: "UNKNOWN",
      amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative retryCount", () => {
    const result = providerPaymentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: 100,
      retryCount: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// paymentSchema
// ---------------------------------------------------------------------------

describe("paymentSchema", () => {
  const VALID_BOOKING_ID = "550e8400-e29b-41d4-a716-446655440020";
  const VALID_ORG_ID = "550e8400-e29b-41d4-a716-446655440030";
  const VALID_PARENT_ID = "550e8400-e29b-41d4-a716-446655440099";
  const VALID_PREFERENCE_ID = "pref-12345";
  const VALID_EXTERNAL_REF = "ext-ref-67890";

  it("accepts a valid payment payload with all fields", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationId).toBe(VALID_ORG_ID);
      expect(result.data.bookingId).toBe(VALID_BOOKING_ID);
      expect(result.data.provider).toBe(PaymentProvider.MERCADOPAGO);
      expect(result.data.amount).toBe(2000);
      expect(result.data.retryCount).toBe(0); // default
    }
  });

  it("rejects a missing organizationId", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID organizationId", () => {
    const result = paymentSchema.safeParse({
      organizationId: "not-a-valid-uuid",
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts preferenceId when present", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      preferenceId: VALID_PREFERENCE_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferenceId).toBe(VALID_PREFERENCE_ID);
    }
  });

  it("accepts payment without preferenceId (optional)", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts externalReference when present", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      externalReference: VALID_EXTERNAL_REF,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.externalReference).toBe(VALID_EXTERNAL_REF);
    }
  });

  it("accepts payment without externalReference (optional)", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
  });

  it("defaults retryCount to 0 when omitted", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retryCount).toBe(0);
    }
  });

  it("accepts a valid UUID parentPaymentId", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      parentPaymentId: VALID_PARENT_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentPaymentId).toBe(VALID_PARENT_ID);
    }
  });

  it("rejects a non-UUID parentPaymentId", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      parentPaymentId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid UUID bookingId", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID bookingId", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: "not-a-uuid",
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing bookingId", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid provider", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: "INVALID",
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative retryCount", () => {
    const result = paymentSchema.safeParse({
      organizationId: VALID_ORG_ID,
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      retryCount: -1,
    });
    expect(result.success).toBe(false);
  });
});
