/**
 * Payments module — presentation barrel.
 *
 * Re-exports the es-AR formatters (status labels, currency formatting).
 * Consumers should import from `@/modules/payments/presentation` (or
 * via the payments module barrel) rather than reaching into the
 * `formatters.ts` file directly.
 */

export * from "./formatters";
