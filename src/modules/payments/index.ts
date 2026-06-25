/**
 * Payments module — public barrel.
 *
 * Re-exports the domain types, the data access layer (reads + error
 * classes), the Server Actions, and (in later PRs) the presentation
 * formatters.
 *
 * The data-layer `retryPayment` write is intentionally NOT re-exported
 * here — it shares its name with the Server Action and the action is
 * the public surface. Server-side callers that need the raw write
 * (e.g. the future webhook handler) can import it directly from
 * `@/modules/payments/data/payment-data`.
 *
 * Consumers should import from `@/modules/payments`:
 *   - Server Components  → `getPayments`, `getPaymentById`
 *   - Server Actions     → `retryPayment` (RBAC + Zod + revalidation)
 *   - Types              → `EnrichedPayment`, `PaymentFilters`,
 *                          `PaginatedPayments`, `DEFAULT_PAGE_SIZE`,
 *                          `PaymentResult`, `RetryPaymentInput`
 *   - Errors             → `PaymentNotFoundError`, `RetryNotAllowedError`
 */

export * from "./domain";

// Data layer — public read API + error classes. The write
// (`retryPayment` in the data layer) is reached through the Server
// Action, which enforces RBAC and Zod validation. The raw data-layer
// write is still available via direct path import for server-side
// scripts and webhook handlers.
export {
  PaymentNotFoundError,
  RetryNotAllowedError,
  getPaymentById,
  getPayments,
} from "./data/payment-data";
export type {
  EnrichedPayment,
  PaginatedPayments,
  PaymentFilters,
} from "./data/payment-data.types";
export { DEFAULT_PAGE_SIZE } from "./data/payment-data.types";

// Server Actions + their schemas + result/input types
export * from "./actions";

// Presentation formatters (es-AR status labels, ARS currency formatting).
// Client Components should import from `@/modules/payments/presentation`
// (or via this barrel) rather than reaching into formatters.ts directly.
export * from "./presentation";
