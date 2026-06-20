import {
  PaymentStatus,
  type PaymentStatusType,
  PaymentType,
  type PaymentTypeType,
} from "@/modules/services/domain";

export const ProviderPaymentStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  IN_PROCESS: "IN_PROCESS",
} as const;

export type ProviderPaymentStatusType =
  (typeof ProviderPaymentStatus)[keyof typeof ProviderPaymentStatus];

export const PaymentProvider = {
  MERCADOPAGO: "MERCADOPAGO",
} as const;

export type PaymentProviderType =
  (typeof PaymentProvider)[keyof typeof PaymentProvider];

export interface Payment {
  id: string;
  organizationId: string;
  bookingId: string;
  provider: PaymentProviderType;
  status: ProviderPaymentStatusType;
  amount: number;
  preferenceId?: string;
  externalReference?: string;
  retryCount: number;
  parentPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapProviderToBusinessStatus(
  providerStatus: ProviderPaymentStatusType,
): PaymentStatusType {
  switch (providerStatus) {
    case ProviderPaymentStatus.PENDING:
    case ProviderPaymentStatus.IN_PROCESS:
      return PaymentStatus.PENDING;
    case ProviderPaymentStatus.APPROVED:
      return PaymentStatus.PAID;
    case ProviderPaymentStatus.REJECTED:
    case ProviderPaymentStatus.CANCELLED:
      return PaymentStatus.FAILED;
    default:
      throw new Error(`Unknown provider payment status: ${providerStatus}`);
  }
}

export const DEFAULT_MAX_RETRIES = 3;

export function canRetry(
  payment: Pick<Payment, "status" | "retryCount">,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): boolean {
  if (payment.status === ProviderPaymentStatus.APPROVED) return false;
  return payment.retryCount < maxRetries;
}

export function isPaymentComplete(
  payments: Pick<Payment, "status" | "parentPaymentId">[],
  paymentType: PaymentTypeType,
): boolean {
  if (paymentType === PaymentType.NONE) return true;

  if (paymentType === PaymentType.FULL) {
    return (
      payments.length > 0 &&
      payments.every((p) => p.status === ProviderPaymentStatus.APPROVED)
    );
  }

  // DEPOSIT: requires at least one parent (parentPaymentId=undefined) and one
  // child (parentPaymentId set), both APPROVED.
  if (paymentType === PaymentType.DEPOSIT) {
    const hasApprovedParent = payments.some(
      (p) =>
        p.parentPaymentId === undefined &&
        p.status === ProviderPaymentStatus.APPROVED,
    );
    const hasApprovedChild = payments.some(
      (p) =>
        p.parentPaymentId !== undefined &&
        p.status === ProviderPaymentStatus.APPROVED,
    );
    return hasApprovedParent && hasApprovedChild;
  }

  return false;
}
