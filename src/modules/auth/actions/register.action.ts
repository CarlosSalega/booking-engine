"use server";

import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";

import { prisma } from "@/lib/prisma";
import { auth } from "@/core/auth";
import { USER_ROLE } from "@/modules/auth/domain";
import {
  type AuthResult,
  type AuthUser,
} from "@/modules/auth/types";

import { type RegisterInput, registerSchema } from "../schemas";

/**
 * Register Server Action.
 *
 * Public registration — role is locked to PATIENT at the action level.
 * The schema intentionally does NOT include `role` (see the schema
 * comment), so even if a hostile client tries to POST a different role
 * the parse strips it before this code runs.
 *
 * We pre-check the email against the database so we can return a
 * Spanish "El email ya está registrado" message instead of relying on
 * Better Auth's generic error, which keeps the UI flow predictable.
 */
export async function register(
  input: RegisterInput,
): Promise<AuthResult<AuthUser>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Datos inválidos" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "El email ya está registrado" };
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        role: USER_ROLE.PATIENT,
      },
      headers: await headers(),
    });

    return { success: true, data: result.user };
  } catch (error) {
    if (isAPIError(error)) {
      return { success: false, error: "No se pudo crear la cuenta" };
    }
    return { success: false, error: "Error al registrar el usuario" };
  }
}
