/**
 * `PaymentStatusFilter` — status filter for the payments list page.
 *
 * Thin wrapper over the generic `StatusFilter` UI component.
 * Configures payment-specific options, base path, and test id.
 */

import {
  ProviderPaymentStatus,
} from "@/modules/payments/domain/payment";
import { getPaymentStatusLabel } from "@/modules/payments/presentation/formatters";

import {
  StatusFilter,
  ALL_VALUE,
  type StatusFilterOption,
} from "@/components/ui/status-filter";

const OPTIONS: StatusFilterOption[] = [
  { value: ALL_VALUE, label: "Todos" },
  { value: ProviderPaymentStatus.PENDING, label: getPaymentStatusLabel(ProviderPaymentStatus.PENDING) },
  { value: ProviderPaymentStatus.APPROVED, label: getPaymentStatusLabel(ProviderPaymentStatus.APPROVED) },
  { value: ProviderPaymentStatus.REJECTED, label: getPaymentStatusLabel(ProviderPaymentStatus.REJECTED) },
  { value: ProviderPaymentStatus.CANCELLED, label: getPaymentStatusLabel(ProviderPaymentStatus.CANCELLED) },
  { value: ProviderPaymentStatus.IN_PROCESS, label: getPaymentStatusLabel(ProviderPaymentStatus.IN_PROCESS) },
];

export function PaymentStatusFilter() {
  return (
    <StatusFilter
      options={OPTIONS}
      basePath="/dashboard/payments"
      testId="payment-status-filter"
    />
  );
}
