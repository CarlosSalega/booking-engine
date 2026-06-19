import { describe, it, expect } from "vitest";

import type { Service } from "../service.schema";
import { moneySchema, serviceSchema } from "../service.schema";
import {
  Currency,
  PaymentType,
  ServiceStatus,
} from "../service";

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const VALID_ORG_ID = "22222222-2222-4222-8222-222222222222";

function makeValidService(overrides: Partial<Service> = {}): Service {
  return {
    id: VALID_ID,
    organizationId: VALID_ORG_ID,
    name: "Consulta",
    description: "Consulta general",
    durationMinutes: 30,
    price: { amount: 2000, currency: Currency.ARS },
    status: ServiceStatus.ACTIVE,
    paymentType: PaymentType.NONE,
    depositAmount: undefined,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("moneySchema", () => {
  it("accepts a valid ARS amount", () => {
    const result = moneySchema.safeParse({
      amount: 1500.5,
      currency: Currency.ARS,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid USD amount", () => {
    const result = moneySchema.safeParse({
      amount: 99.99,
      currency: Currency.USD,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = moneySchema.safeParse({
      amount: -100,
      currency: Currency.ARS,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero amount (free service)", () => {
    const result = moneySchema.safeParse({
      amount: 0,
      currency: Currency.ARS,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid currency", () => {
    const result = moneySchema.safeParse({
      amount: 100,
      currency: "EUR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount with more than 2 decimal places", () => {
    const result = moneySchema.safeParse({
      amount: 100.123,
      currency: Currency.ARS,
    });
    expect(result.success).toBe(false);
  });
});

describe("serviceSchema — valid cases", () => {
  it("accepts a service with NONE payment type", () => {
    const result = serviceSchema.safeParse(makeValidService());
    expect(result.success).toBe(true);
  });

  it("accepts a service with DEPOSIT payment and a valid deposit", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.DEPOSIT,
        price: { amount: 2000, currency: Currency.ARS },
        depositAmount: { amount: 500, currency: Currency.ARS },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a service with FULL payment and no deposit", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.FULL,
        price: { amount: 3000, currency: Currency.USD },
        depositAmount: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts ACTIVE status", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ status: ServiceStatus.ACTIVE }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts INACTIVE status", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ status: ServiceStatus.INACTIVE }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a service without description", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ description: undefined }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a service without price", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ price: undefined }),
    );
    expect(result.success).toBe(true);
  });
});

describe("serviceSchema — rejection cases", () => {
  it("rejects DEPOSIT without depositAmount (rule 1)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.DEPOSIT,
        price: { amount: 2000, currency: Currency.ARS },
        depositAmount: undefined,
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Deposit is required for DEPOSIT payment type",
        ),
      ).toBe(true);
    }
  });

  it("rejects DEPOSIT with depositAmount of zero", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.DEPOSIT,
        price: { amount: 2000, currency: Currency.ARS },
        depositAmount: { amount: 0, currency: Currency.ARS },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Deposit amount must be greater than zero",
        ),
      ).toBe(true);
    }
  });

  it("rejects deposit exceeding price (rule 2)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.DEPOSIT,
        price: { amount: 1000, currency: Currency.ARS },
        depositAmount: { amount: 1500, currency: Currency.ARS },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Deposit must not exceed price",
        ),
      ).toBe(true);
    }
  });

  it("rejects NONE payment type with depositAmount (rule 3)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.NONE,
        depositAmount: { amount: 100, currency: Currency.ARS },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Deposit not allowed for NONE payment type",
        ),
      ).toBe(true);
    }
  });

  it("rejects zero duration (rule 4)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ durationMinutes: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects negative duration (rule 4)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ durationMinutes: -5 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects non-integer duration (rule 4)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ durationMinutes: 30.5 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects empty name (rule 5)", () => {
    const result = serviceSchema.safeParse(makeValidService({ name: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Name must be 1-100 characters",
        ),
      ).toBe(true);
    }
  });

  it("rejects name longer than 100 characters (rule 5)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ name: "a".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 characters (rule 6)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ description: "a".repeat(501) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an invalid UUID for id", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ id: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an invalid UUID for organizationId", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ organizationId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    // @ts-expect-error - intentionally passing invalid runtime value to test Zod validation
    const invalid = makeValidService({ status: "PAUSED" });
    const result = serviceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid paymentType", () => {
    // @ts-expect-error - intentionally passing invalid runtime value to test Zod validation
    const invalid = makeValidService({ paymentType: "PARTIAL" });
    const result = serviceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("serviceSchema — edge cases (boundary values)", () => {
  it("accepts durationMinutes of exactly 1", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ durationMinutes: 1 }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts name with exactly 100 characters", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ name: "a".repeat(100) }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts description with exactly 500 characters", () => {
    const result = serviceSchema.safeParse(
      makeValidService({ description: "a".repeat(500) }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts deposit exactly equal to price (rule 2 boundary)", () => {
    const result = serviceSchema.safeParse(
      makeValidService({
        paymentType: PaymentType.DEPOSIT,
        price: { amount: 1000, currency: Currency.ARS },
        depositAmount: { amount: 1000, currency: Currency.ARS },
      }),
    );
    expect(result.success).toBe(true);
  });
});
