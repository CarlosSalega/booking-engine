"use server";

import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";

import { auth } from "@/core/auth";
import { type AuthResult } from "@/modules/auth/types";

import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from "../schemas";

/**
 * Reset password Server Action.
 *
 * Sends a password-reset email via Better Auth. The endpoint always
 * returns success (even for unknown addresses) to prevent email
 * enumeration — the caller therefore surfaces a generic
 * confirmation message regardless of the address submitted.
 *
 * `redirectTo` is the URL the user is bounced to after clicking the
 * link in the email. The `/reset-password` page is created in PR 3.
 */
export async function resetPassword(
  input: ResetPasswordInput,
): Promise<AuthResult<{ status: boolean; message: string }>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  try {
    const result = await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: "/reset-password",
      },
      headers: await headers(),
    });

    return {
      success: true,
      data: { status: result.status, message: result.message },
    };
  } catch (error) {
    if (isAPIError(error)) {
      return { success: false, error: "No se pudo enviar el email" };
    }
    return { success: false, error: "Error al solicitar el reseteo de contraseña" };
  }
}
