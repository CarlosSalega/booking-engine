import { describe, it, expect } from "vitest";

import { PaymentProvider, ProviderPaymentStatus } from "../payment";
import { paymentSchema, providerPaymentSchema } from "../payment.schema";

// ---------------------------------------------------------------------------
// providerPaymentSchema
// ---------------------------------------------------------------------------

describe("providerPaymentSchema", () => {
  it("accepts a valid provider payment payload", () => {
    const result = providerPaymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: 2000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe(PaymentProvider.MERCADOPAGO);
      expect(result.data.status).toBe(ProviderPaymentStatus.PENDING);
      expect(result.data.amount).toBe(2000);
      expect(result.data.retryCount).toBe(0); // default
    }
  });

  it("defaults retryCount to 0 when omitted", () => {
    const result = providerPaymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.APPROVED,
      amount: 500,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retryCount).toBe(0);
    }
  });

  it("accepts an explicit retryCount >= 0", () => {
    const result = providerPaymentSchema.safeParse({
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
      provider: "STRIPE",
      status: ProviderPaymentStatus.PENDING,
      amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown provider status", () => {
    const result = providerPaymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      status: "UNKNOWN",
      amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = providerPaymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = providerPaymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      status: ProviderPaymentStatus.PENDING,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative retryCount", () => {
    const result = providerPaymentSchema.safeParse({
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

  it("accepts a valid payment payload with all fields", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookingId).toBe(VALID_BOOKING_ID);
      expect(result.data.provider).toBe(PaymentProvider.MERCADOPAGO);
      expect(result.data.amount).toBe(2000);
      expect(result.data.retryCount).toBe(0); // default
    }
  });

  it("defaults retryCount to 0 when omitted", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retryCount).toBe(0);
    }
  });

  it("accepts an optional parentPaymentId", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      parentPaymentId: "550e8400-e29b-41d4-a716-446655440099",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty bookingId", () => {
    const result = paymentSchema.safeParse({
      bookingId: "",
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing bookingId", () => {
    const result = paymentSchema.safeParse({
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid provider", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: "INVALID",
      amount: 2000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative retryCount", () => {
    const result = paymentSchema.safeParse({
      bookingId: VALID_BOOKING_ID,
      provider: PaymentProvider.MERCADOPAGO,
      amount: 2000,
      retryCount: -1,
    });
    expect(result.success).toBe(false);
  });
});
