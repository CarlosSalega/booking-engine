"use server";

import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";

import { auth } from "@/core/auth";
import {
  type AuthResult,
  type LoginSession,
} from "@/modules/auth/types";

import { type LoginInput, loginSchema } from "../schemas";

/**
 * Login Server Action.
 *
 * Validates credentials with the Zod 4 login schema, then delegates to
 * Better Auth's `signInEmail` endpoint. On success returns the session
 * token and the user record; on failure returns a Spanish user-facing
 * error message.
 *
 * Server Actions must forward the inbound request headers so Better
 * Auth can read the session cookie and issue a fresh one.
 */
export async function login(input: LoginInput): Promise<AuthResult<LoginSession>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  try {
    const result = await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });

    return {
      success: true,
      data: { token: result.token, user: result.user },
    };
  } catch (error) {
    if (isAPIError(error)) {
      return { success: false, error: "Credenciales inválidas" };
    }
    return { success: false, error: "Error al iniciar sesión" };
  }
}
