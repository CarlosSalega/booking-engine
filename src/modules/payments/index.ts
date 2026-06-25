/**
 * Payments module — public barrel.
 *
 * Re-exports the domain types, the data access layer (queries + types
 * + error classes), and (in later PRs) the Server Actions and the
 * presentation formatters.
 *
 * The data-layer `retryPayment` write is intentionally exposed — it is
 * the only mutation in the payments module. Later PRs will wrap it
 * with auth + RBAC at the action layer; consumers should prefer the
 * Server Action once it lands, but the data function remains a valid
 * entry point for server-side callers (e.g. webhook handlers).
 *
 * Consumers should import from `@/modules/payments`:
 *   - Server Components  → `getPayments`, `getPaymentById`
 *   - Server Actions     → `retryPayment` (PR #2 will add RBAC)
 *   - Types              → `EnrichedPayment`, `PaymentFilters`,
 *                          `PaginatedPayments`, `DEFAULT_PAGE_SIZE`
 *   - Errors             → `PaymentNotFoundError`, `RetryNotAllowedError`
 */

export * from "./domain";

// Data layer — public read API + the single retry write
export {
  PaymentNotFoundError,
  RetryNotAllowedError,
  getPaymentById,
  getPayments,
  retryPayment,
} from "./data/payment-data";
export type {
  EnrichedPayment,
  PaginatedPayments,
  PaymentFilters,
} from "./data/payment-data.types";
export { DEFAULT_PAGE_SIZE } from "./data/payment-data.types";
