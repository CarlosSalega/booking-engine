/**
 * Money value object — represents a monetary amount with currency.
 * No identity, immutable by convention.
 */
export interface Money {
  amount: number;
  currency: CurrencyType;
}

export const Currency = {
  ARS: "ARS",
  USD: "USD",
} as const;

export type CurrencyType = (typeof Currency)[keyof typeof Currency];

export const ServiceStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type ServiceStatusType = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export const PaymentType = {
  NONE: "NONE",
  DEPOSIT: "DEPOSIT",
  FULL: "FULL",
} as const;

export type PaymentTypeType = (typeof PaymentType)[keyof typeof PaymentType];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const DEFAULT_DURATION_MINUTES = 30;
