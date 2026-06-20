"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useSession } from "@/modules/auth/hooks";
import { login } from "@/modules/auth/actions";
import { type AuthResult } from "@/modules/auth/types";
import { type LoginSession } from "@/modules/auth/types";

type LoginState = AuthResult<LoginSession> | null;

/**
 * Adapter from the form's `(prevState, formData)` shape that
 * `useActionState` expects to the `login(input)` Server Action signature.
 *
 * Returning the action's result as the next state lets the component
 * read `state.error` / `state.success` after the form submits.
 */
async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const input = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };
  return login(input);
}

/**
 * `/login` — public page.
 *
 * Behavior:
 * 1. If a session already exists, show a brief "already signed in" message
 *    with a link to `/` instead of the form. Avoids the awkward case of
 *    a logged-in user staring at a login form.
 * 2. Otherwise render the form. `useActionState` handles the pending
 *    state and the error returned by the Server Action.
 */
export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [state, formAction, isSubmitting] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  // Bounce authenticated users back to the dashboard as soon as we know
  // they have a session. The visible "already signed in" card stays
  // around as a fallback for the brief window before redirect kicks in
  // (and for users with JS off, the proxy still blocks their access to
  // protected pages but lets them see this page).
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
            Tu sesión está activa. Continúa al inicio para usar la plataforma.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Iniciar sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa con tu email y contraseña.
          </p>
        </header>

        <form action={formAction} className="space-y-4" noValidate>
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
              autoComplete="current-password"
              required
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
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
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
