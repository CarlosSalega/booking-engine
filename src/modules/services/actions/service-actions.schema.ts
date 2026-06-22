/**
 * Services Server Actions — Zod 4 input schemas.
 *
 * The schemas are the single source of truth for what each Server Action
 * accepts. The action files `safeParse` against them and the input types
 * are inferred via `z.infer` (see `service-actions.types.ts`).
 *
 * Conventions:
 * - Zod 4 syntax: `z.uuid()` / `z.email()` (top-level validators), and
 *   the `error` parameter on every constraint (not the Zod 3 `message`).
 * - Every error message is in Spanish — the action returns these
 *   directly to the UI.
 * - UUIDs use `z.uuid()` (not `z.string().uuid()`) per Zod 4.
 * - The depositAmount / paymentType / price cross-field invariants are
 *   enforced via `.superRefine` mirroring the domain `serviceSchema`.
 */

import { z } from "zod";

import {
  Currency,
  PaymentType,
  ServiceStatus,
} from "../domain/service";

// ---------------------------------------------------------------------------
// Spanish error messages — single source of truth for the action layer.
// ---------------------------------------------------------------------------

const MSG = {
  nameRequired: "El nombre es requerido",
  nameMax: "El nombre debe tener máximo 100 caracteres",
  descriptionMax: "La descripción debe tener máximo 500 caracteres",
  durationInt: "La duración debe ser un número entero",
  durationPositive: "La duración debe ser un número positivo",
  priceNonNegative: "El precio no puede ser negativo",
  priceDecimals: "El precio debe tener como máximo 2 decimales",
  depositNonNegative: "El monto de la seña no puede ser negativo",
  depositDecimals: "El monto de la seña debe tener como máximo 2 decimales",
  currencyInvalid: "Moneda inválida",
  paymentTypeInvalid: "Tipo de pago inválido",
  statusInvalid: "Estado del servicio inválido",
  professionalIdInvalid: "ID de profesional inválido",
  serviceIdInvalid: "ID de servicio inválido",
  depositRequiredForDeposit:
    "La seña es requerida cuando el tipo de pago es DEPOSIT",
  depositGreaterThanZero: "El monto de la seña debe ser mayor a cero",
  depositExceedsPrice: "La seña no puede ser mayor al precio",
  depositNotAllowedForNone:
    "La seña no está permitida cuando el tipo de pago es NONE",
} as const;

// ---------------------------------------------------------------------------
// moneySchema (action) — the input shape for `price` and `depositAmount`.
// Mirrors the domain `moneySchema` but with Spanish error messages.
// ---------------------------------------------------------------------------

/**
 * Money shape used by the action layer for `price` and `depositAmount`.
 * Equivalent to the domain `moneySchema` but with Spanish errors and
 * `nonnegative` (vs `gte(0)`) for clarity. Currency is an ARS/USD enum
 * matching the domain — the data layer will flatten the value object
 * to a Float on write and re-hydrate with hardcoded ARS on read.
 */
export const actionMoneySchema = z.object({
  amount: z
    .number()
    .nonnegative({ error: MSG.priceNonNegative })
    .multipleOf(0.01, { error: MSG.priceDecimals }),
  currency: z.enum([Currency.ARS, Currency.USD], { error: MSG.currencyInvalid }),
});

// ---------------------------------------------------------------------------
// createServiceSchema — full payload for creating a new service.
// ---------------------------------------------------------------------------

/**
 * Input for `createService`.
 *
 * - `name` is required (min 1 char, max 100).
 * - `description` is optional; max 500 chars.
 * - `durationMinutes` is required; must be a positive integer.
 * - `price` is optional; a `Money` value object.
 * - `paymentType` is required; one of NONE / DEPOSIT / FULL.
 * - `depositAmount` is optional; required (and > 0) when paymentType=DEPOSIT;
 *   forbidden when paymentType=NONE; must not exceed `price` if both are set.
 * - `professionalId` is required (UUID) — persistence bridge from the
 *   Prisma model that is not in the domain `Service` type.
 * - `status` is optional and defaults to ACTIVE.
 */
export const createServiceSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: MSG.nameRequired })
      .max(100, { error: MSG.nameMax }),
    description: z
      .string()
      .max(500, { error: MSG.descriptionMax })
      .optional(),
    durationMinutes: z
      .number()
      .int({ error: MSG.durationInt })
      .positive({ error: MSG.durationPositive }),
    price: actionMoneySchema.optional(),
    paymentType: z.enum(
      [PaymentType.NONE, PaymentType.DEPOSIT, PaymentType.FULL],
      { error: MSG.paymentTypeInvalid },
    ),
    depositAmount: actionMoneySchema.optional(),
    professionalId: z.uuid({ error: MSG.professionalIdInvalid }),
    status: z
      .enum([ServiceStatus.ACTIVE, ServiceStatus.INACTIVE], {
        error: MSG.statusInvalid,
      })
      .default(ServiceStatus.ACTIVE),
  })
  .superRefine((data, ctx) => {
    // DEPOSIT requires a positive depositAmount.
    if (data.paymentType === PaymentType.DEPOSIT) {
      if (data.depositAmount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: MSG.depositRequiredForDeposit,
          path: ["depositAmount"],
        });
      } else if (data.depositAmount.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: MSG.depositGreaterThanZero,
          path: ["depositAmount"],
        });
      }
    }

    // NONE cannot have a deposit.
    if (
      data.paymentType === PaymentType.NONE &&
      data.depositAmount !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MSG.depositNotAllowedForNone,
        path: ["depositAmount"],
      });
    }

    // depositAmount must not exceed price.
    if (
      data.depositAmount !== undefined &&
      data.price !== undefined &&
      data.depositAmount.amount > data.price.amount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MSG.depositExceedsPrice,
        path: ["depositAmount"],
      });
    }
  });

// ---------------------------------------------------------------------------
// updateServiceSchema — id + optional fields for partial updates.
// ---------------------------------------------------------------------------

/**
 * Input for `updateService`.
 *
 * - `id` is required (UUID).
 * - All other fields are optional — only the provided ones are updated.
 * - The cross-field depositAmount rules (DEPOSIT requires depositAmount,
 *   NONE rejects depositAmount, depositAmount must not exceed price) are
 *   only checked when BOTH fields are present in the input. Partial
 *   updates where one side is intentionally set in a later step pass
 *   validation here and are caught by the form layer.
 */
export const updateServiceSchema = z
  .object({
    id: z.uuid({ error: MSG.serviceIdInvalid }),
    name: z
      .string()
      .min(1, { error: MSG.nameRequired })
      .max(100, { error: MSG.nameMax })
      .optional(),
    description: z
      .string()
      .max(500, { error: MSG.descriptionMax })
      .optional(),
    durationMinutes: z
      .number()
      .int({ error: MSG.durationInt })
      .positive({ error: MSG.durationPositive })
      .optional(),
    price: actionMoneySchema.optional(),
    paymentType: z
      .enum([PaymentType.NONE, PaymentType.DEPOSIT, PaymentType.FULL], {
        error: MSG.paymentTypeInvalid,
      })
      .optional(),
    // Nullable to allow explicit clear (data layer maps null → null).
    depositAmount: actionMoneySchema.nullable().optional(),
    professionalId: z.uuid({ error: MSG.professionalIdInvalid }).optional(),
    status: z
      .enum([ServiceStatus.ACTIVE, ServiceStatus.INACTIVE], {
        error: MSG.statusInvalid,
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // NONE rejects depositAmount when both are present in the update.
    if (
      data.paymentType === PaymentType.NONE &&
      data.depositAmount !== undefined &&
      data.depositAmount !== null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MSG.depositNotAllowedForNone,
        path: ["depositAmount"],
      });
    }

    // DEPOSIT requires a positive depositAmount when both are present.
    if (
      data.paymentType === PaymentType.DEPOSIT &&
      data.depositAmount !== undefined &&
      data.depositAmount !== null
    ) {
      if (data.depositAmount.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: MSG.depositGreaterThanZero,
          path: ["depositAmount"],
        });
      }
    }

    // depositAmount must not exceed price when both are present.
    if (
      data.depositAmount !== undefined &&
      data.depositAmount !== null &&
      data.price !== undefined &&
      data.depositAmount.amount > data.price.amount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MSG.depositExceedsPrice,
        path: ["depositAmount"],
      });
    }
  });

// ---------------------------------------------------------------------------
// changeServiceStatusSchema — minimal payload for status transitions.
// ---------------------------------------------------------------------------

/**
 * Input for `changeServiceStatus`.
 *
 * - `id` is required (UUID).
 * - `status` is required and must be ACTIVE or INACTIVE. No state
 *   machine — any transition is valid (see design.md AD4).
 */
export const changeServiceStatusSchema = z.object({
  id: z.uuid({ error: MSG.serviceIdInvalid }),
  status: z.enum([ServiceStatus.ACTIVE, ServiceStatus.INACTIVE], {
    error: MSG.statusInvalid,
  }),
});
