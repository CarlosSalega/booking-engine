"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";

import { auth } from "@/core/auth";
import { type AuthResult } from "@/modules/auth/types";

/**
 * Logout Server Action.
 *
 * Invalidates the current session via Better Auth and then redirects
 * the user to `/login`. `redirect()` throws a NEXT_REDIRECT sentinel
 * that Next.js intercepts, so the success branch never reaches the
 * return statement — the `AuthResult` return type only matters for
 * the error branch (signOut failed).
 */
export async function logout(): Promise<AuthResult<{ success: true }>> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    if (isAPIError(error)) {
      return { success: false, error: "No se pudo cerrar la sesión" };
    }
    return { success: false, error: "Error al cerrar sesión" };
  }

  redirect("/login");
}
