/**
 * Services module — presentation barrel.
 *
 * Re-exports the es-AR formatters (status labels, payment-type
 * labels, currency formatting). Consumers should import from
 * `@/modules/services/presentation` (or via the services module
 * barrel) rather than reaching into individual files.
 */

export * from "./formatters";
