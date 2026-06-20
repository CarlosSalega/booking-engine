"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useSession } from "@/modules/auth/hooks";
import { register } from "@/modules/auth/actions";
import { type AuthResult, type AuthUser } from "@/modules/auth/types";

type RegisterState = AuthResult<AuthUser> | null;

/**
 * Adapter from the form's `(prevState, formData)` shape that
 * `useActionState` expects to the `register(input)` Server Action
 * signature. The Server Action assigns the `role` (always PATIENT
 * for public registration) — it is intentionally NOT read from the
 * form payload.
 */
async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const input = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };
  return register(input);
}

/**
 * `/register` — public page, role locked to PATIENT.
 *
 * Behavior:
 * 1. If a session already exists, show a brief "already signed in"
 *    card with a link to `/` instead of the form.
 * 2. Otherwise render the form (name, email, password) and use
 *    `useActionState` to surface the Server Action's result.
 * 3. The local `password` state drives a "8+ chars" hint chip — the
 *    hint is purely visual, the real validation lives in
 *    `registerSchema` (min 8 chars) and in Better Auth's password
 *    hashing rules on the server.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [state, formAction, isSubmitting] = useActionState<RegisterState, FormData>(
    registerAction,
    null,
  );
  const [password, setPassword] = useState("");

  // On successful registration we land authenticated — bounce to `/`.
  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  if (sessionLoading) {
    return null;
  }

  if (session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Ya has iniciado sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Cierra la sesión actual para crear una cuenta nueva.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>
    );
  }

  const passwordLongEnough = password.length >= 8;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Crear cuenta
          </h1>
          <p className="text-sm text-muted-foreground">
            Regístrate como paciente para reservar tus turnos.
          </p>
        </header>

        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-foreground"
            >
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p
              className={
                passwordLongEnough
                  ? "text-xs text-primary"
                  : "text-xs text-muted-foreground"
              }
            >
              {passwordLongEnough
                ? "✓ Al menos 8 caracteres"
                : "Mínimo 8 caracteres"}
            </p>
          </div>

          {state && !state.success ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
