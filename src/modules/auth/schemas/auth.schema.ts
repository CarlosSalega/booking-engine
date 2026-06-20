import { z } from "zod";

/**
 * Public registration schema.
 *
 * - `name`: 1-100 characters.
 * - `email`: valid email format.
 * - `password`: minimum 8 characters.
 *
 * The `role` is intentionally NOT in this schema. Public registration is
 * always PATIENT, but the assignment happens in the Server Action so the
 * form payload (and the inferred `RegisterInput` type) stays free of a
 * locked-to-PATIENT literal that would leak implementation detail into
 * the UI layer.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, { error: "El nombre es obligatorio" })
    .max(100, { error: "El nombre debe tener entre 1 y 100 caracteres" }),
  email: z
    .string()
    .pipe(z.email({ error: "Email inválido" })),
  password: z
    .string()
    .min(8, { error: "La contraseña debe tener al menos 8 caracteres" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login schema — email and password.
 *
 * The password only needs to be non-empty here; Better Auth enforces the
 * real credentials check on the server.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .pipe(z.email({ error: "Email inválido" })),
  password: z
    .string()
    .min(1, { error: "La contraseña es obligatoria" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Reset password schema — just an email.
 *
 * Better Auth's reset endpoint always returns success even for unknown
 * addresses (anti-enumeration), so the action only needs the email.
 */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .pipe(z.email({ error: "Email inválido" })),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
