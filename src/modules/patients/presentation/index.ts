/**
 * Patients module — presentation barrel.
 *
 * Re-exports the es-AR formatters (status labels, name formatting).
 * Consumers should import from `@/modules/patients/presentation`
 * (or via the patients module barrel) rather than reaching into
 * individual files.
 */

export * from "./formatters";
