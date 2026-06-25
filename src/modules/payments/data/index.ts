/**
 * Payments data layer — barrel.
 *
 * Re-exports the data access functions and the public types. The
 * `retryPayment` write is the only mutation exposed here; the action
 * layer (PR #2) wraps it with auth + RBAC.
 *
 * Consumers should import from `@/modules/payments/data` (or via the
 * module barrel `@/modules/payments`).
 */

export {
  PaymentNotFoundError,
  RetryNotAllowedError,
  getPaymentById,
  getPayments,
  retryPayment,
} from "./payment-data";
export type {
  EnrichedPayment,
  PaginatedPayments,
  PaymentFilters,
} from "./payment-data.types";
export { DEFAULT_PAGE_SIZE } from "./payment-data.types";
