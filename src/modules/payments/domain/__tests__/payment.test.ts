import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { PaymentStatus, PaymentType } from "@/modules/services/domain";
import {
  DEFAULT_MAX_RETRIES,
  PaymentProvider,
  ProviderPaymentStatus,
  canRetry,
  isPaymentComplete,
  mapProviderToBusinessStatus,
  type Payment,
  type PaymentProviderType,
  type ProviderPaymentStatusType,
} from "../payment";
import {
  DEFAULT_MAX_RETRIES as DEFAULT_MAX_RETRIES_FROM_BARREL,
  PaymentProvider as PaymentProviderFromBarrel,
  ProviderPaymentStatus as ProviderPaymentStatusFromBarrel,
  canRetry as canRetryFromBarrel,
  isPaymentComplete as isPaymentCompleteFromBarrel,
  mapProviderToBusinessStatus as mapProviderToBusinessStatusFromBarrel,
} from "@/modules/payments/domain";
import {
  DEFAULT_MAX_RETRIES as DEFAULT_MAX_RETRIES_FROM_MODULE,
  PaymentProvider as PaymentProviderFromModule,
  ProviderPaymentStatus as ProviderPaymentStatusFromModule,
  canRetry as canRetryFromModule,
  isPaymentComplete as isPaymentCompleteFromModule,
  mapProviderToBusinessStatus as mapProviderToBusinessStatusFromModule,
} from "@/modules/payments";
import type { Payment as PaymentFromBarrel } from "@/modules/payments";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("ProviderPaymentStatus", () => {
  it("exposes all 5 MercadoPago lifecycle states", () => {
    expect(ProviderPaymentStatus.PENDING).toBe("PENDING");
    expect(ProviderPaymentStatus.IN_PROCESS).toBe("IN_PROCESS");
    expect(ProviderPaymentStatus.APPROVED).toBe("APPROVED");
    expect(ProviderPaymentStatus.REJECTED).toBe("REJECTED");
    expect(ProviderPaymentStatus.CANCELLED).toBe("CANCELLED");

    // Type-level: derived union is assignable from a literal
    const sample: ProviderPaymentStatusType = ProviderPaymentStatus.APPROVED;
    expect(sample).toBe("APPROVED");
  });
});

describe("PaymentProvider", () => {
  it("exposes MERCADOPAGO provider", () => {
    expect(PaymentProvider.MERCADOPAGO).toBe("MERCADOPAGO");

    const sample: PaymentProviderType = PaymentProvider.MERCADOPAGO;
    expect(sample).toBe("MERCADOPAGO");
  });
});

describe("DEFAULT_MAX_RETRIES", () => {
  it("equals 3", () => {
    expect(DEFAULT_MAX_RETRIES).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Payment interface (structural test — compile-time check)
// ---------------------------------------------------------------------------

const PAYMENT_ID = "550e8400-e29b-41d4-a716-446655440010";
const ORG_ID = "550e8400-e29b-41d4-a716-446655440001";
const BOOKING_ID = "550e8400-e29b-41d4-a716-446655440020";

function makeValidPayment(
  overrides: Partial<Payment> = {},
): Payment {
  return {
    id: PAYMENT_ID,
    organizationId: ORG_ID,
    bookingId: BOOKING_ID,
    provider: PaymentProvider.MERCADOPAGO,
    status: ProviderPaymentStatus.PENDING,
    amount: 2000,
    retryCount: 0,
    createdAt: new Date("2026-06-20T10:00:00Z"),
    updatedAt: new Date("2026-06-20T10:00:00Z"),
    ...overrides,
  };
}

describe("Payment interface", () => {
  it("accepts a fully populated payment", () => {
    const payment: Payment = makeValidPayment({
      preferenceId: "pref-123",
      externalReference: "ext-ref-456",
      parentPaymentId: "550e8400-e29b-41d4-a716-446655440099",
    });
    expect(payment.id).toBe(PAYMENT_ID);
    expect(payment.provider).toBe(PaymentProvider.MERCADOPAGO);
    expect(payment.parentPaymentId).toBe(
      "550e8400-e29b-41d4-a716-446655440099",
    );
  });

  it("accepts a payment without optional fields", () => {
    const payment: Payment = makeValidPayment();
    expect(payment.parentPaymentId).toBeUndefined();
    expect(payment.preferenceId).toBeUndefined();
    expect(payment.externalReference).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mapProviderToBusinessStatus — ACL
// ---------------------------------------------------------------------------

describe("mapProviderToBusinessStatus", () => {
  it("maps PENDING → PENDING", () => {
    expect(mapProviderToBusinessStatus(ProviderPaymentStatus.PENDING)).toBe(
      PaymentStatus.PENDING,
    );
  });

  it("maps IN_PROCESS → PENDING", () => {
    expect(mapProviderToBusinessStatus(ProviderPaymentStatus.IN_PROCESS)).toBe(
      PaymentStatus.PENDING,
    );
  });

  it("maps APPROVED → PAID", () => {
    expect(mapProviderToBusinessStatus(ProviderPaymentStatus.APPROVED)).toBe(
      PaymentStatus.PAID,
    );
  });

  it("maps REJECTED → FAILED", () => {
    expect(mapProviderToBusinessStatus(ProviderPaymentStatus.REJECTED)).toBe(
      PaymentStatus.FAILED,
    );
  });

  it("maps CANCELLED → FAILED", () => {
    expect(mapProviderToBusinessStatus(ProviderPaymentStatus.CANCELLED)).toBe(
      PaymentStatus.FAILED,
    );
  });

  it("throws on unknown provider status (fail-closed)", () => {
    expect(() =>
      mapProviderToBusinessStatus("UNKNOWN" as ProviderPaymentStatusType),
    ).toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// canRetry
// ---------------------------------------------------------------------------

describe("canRetry", () => {
  it("returns true when retryCount is below default maxRetries (3)", () => {
    const payment = makeValidPayment({
      status: ProviderPaymentStatus.PENDING,
      retryCount: 1,
    });
    expect(canRetry(payment)).toBe(true);
  });

  it("returns true when retryCount is at maxRetries-1 and status is FAILED", () => {
    const payment = makeValidPayment({
      status: ProviderPaymentStatus.REJECTED,
      retryCount: 2,
    });
    expect(canRetry(payment)).toBe(true);
  });

  it("returns false when retryCount equals maxRetries (default 3)", () => {
    const payment = makeValidPayment({
      status: ProviderPaymentStatus.REJECTED,
      retryCount: 3,
    });
    expect(canRetry(payment)).toBe(false);
  });

  it("returns false when status is APPROVED, even with retryCount=0", () => {
    const payment = makeValidPayment({
      status: ProviderPaymentStatus.APPROVED,
      retryCount: 0,
    });
    expect(canRetry(payment)).toBe(false);
  });

  it("honors custom maxRetries argument (maxRetries=5)", () => {
    const payment = makeValidPayment({
      status: ProviderPaymentStatus.REJECTED,
      retryCount: 4,
    });
    expect(canRetry(payment, 5)).toBe(true);
    expect(canRetry(payment, 4)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPaymentComplete
// ---------------------------------------------------------------------------

describe("isPaymentComplete", () => {
  it("returns true for FULL with a single APPROVED payment", () => {
    const payments = [
      { status: ProviderPaymentStatus.APPROVED, parentPaymentId: undefined },
    ];
    expect(isPaymentComplete(payments, PaymentType.FULL)).toBe(true);
  });

  it("returns false for FULL with a single PENDING payment", () => {
    const payments = [
      { status: ProviderPaymentStatus.PENDING, parentPaymentId: undefined },
    ];
    expect(isPaymentComplete(payments, PaymentType.FULL)).toBe(false);
  });

  it("returns true for DEPOSIT when both parent and child are APPROVED", () => {
    const payments = [
      {
        status: ProviderPaymentStatus.APPROVED,
        parentPaymentId: undefined,
      },
      {
        status: ProviderPaymentStatus.APPROVED,
        parentPaymentId: "550e8400-e29b-41d4-a716-446655440099",
      },
    ];
    expect(isPaymentComplete(payments, PaymentType.DEPOSIT)).toBe(true);
  });

  it("returns false for DEPOSIT when only parent is APPROVED", () => {
    const payments = [
      {
        status: ProviderPaymentStatus.APPROVED,
        parentPaymentId: undefined,
      },
      {
        status: ProviderPaymentStatus.PENDING,
        parentPaymentId: "550e8400-e29b-41d4-a716-446655440099",
      },
    ];
    expect(isPaymentComplete(payments, PaymentType.DEPOSIT)).toBe(false);
  });

  it("returns false for DEPOSIT when parent is FAILED", () => {
    const payments = [
      { status: ProviderPaymentStatus.REJECTED, parentPaymentId: undefined },
      {
        status: ProviderPaymentStatus.APPROVED,
        parentPaymentId: "550e8400-e29b-41d4-a716-446655440099",
      },
    ];
    expect(isPaymentComplete(payments, PaymentType.DEPOSIT)).toBe(false);
  });

  it("returns true for NONE even with empty payments", () => {
    expect(isPaymentComplete([], PaymentType.NONE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Barrel completeness
// ---------------------------------------------------------------------------

describe("barrel completeness", () => {
  it("re-exports all public domain symbols from @/modules/payments/domain", () => {
    // Runtime exports — referenced so the import is not tree-shaken
    expect(typeof ProviderPaymentStatus).toBe("object");
    expect(typeof PaymentProvider).toBe("object");
    expect(typeof DEFAULT_MAX_RETRIES).toBe("number");
    expect(typeof canRetry).toBe("function");
    expect(typeof isPaymentComplete).toBe("function");
    expect(typeof mapProviderToBusinessStatus).toBe("function");

    // Domain barrel re-exports must point to the same identity as direct imports
    expect(ProviderPaymentStatusFromBarrel).toBe(ProviderPaymentStatus);
    expect(PaymentProviderFromBarrel).toBe(PaymentProvider);
    expect(DEFAULT_MAX_RETRIES_FROM_BARREL).toBe(DEFAULT_MAX_RETRIES);
    expect(canRetryFromBarrel).toBe(canRetry);
    expect(isPaymentCompleteFromBarrel).toBe(isPaymentComplete);
    expect(mapProviderToBusinessStatusFromBarrel).toBe(
      mapProviderToBusinessStatus,
    );

    // Module barrel re-exports must also point to the same identity
    expect(ProviderPaymentStatusFromModule).toBe(ProviderPaymentStatus);
    expect(PaymentProviderFromModule).toBe(PaymentProvider);
    expect(DEFAULT_MAX_RETRIES_FROM_MODULE).toBe(DEFAULT_MAX_RETRIES);
    expect(canRetryFromModule).toBe(canRetry);
    expect(isPaymentCompleteFromModule).toBe(isPaymentComplete);
    expect(mapProviderToBusinessStatusFromModule).toBe(
      mapProviderToBusinessStatus,
    );

    // Type-level: type-only barrel import must compile (already verified by tsc)
    type _CheckTypes = PaymentFromBarrel;
    const _typeProbe: _CheckTypes | undefined = undefined;
    expect(_typeProbe).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Module isolation
// ---------------------------------------------------------------------------

describe("module isolation", () => {
  it("payment.ts does not import next/*, react, or @prisma/client", () => {
    const domainDir = join(__dirname, "..");
    const files = ["payment.ts", "index.ts"];
    for (const file of files) {
      const source = readFileSync(join(domainDir, file), "utf-8");
      expect(
        source,
        `${file} must not import from next/*`,
      ).not.toMatch(/from\s+["']next\//);
      expect(
        source,
        `${file} must not import react`,
      ).not.toMatch(/from\s+["']react["']/);
      expect(
        source,
        `${file} must not import @prisma/client`,
      ).not.toMatch(/from\s+["']@prisma\/client/);
    }
  });
});
