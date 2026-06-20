"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd, Mail, Lock, User } from "lucide-react";
import toast from "react-hot-toast";

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
 * 4. Toast notifications surface the Server Action outcome.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [state, formAction, isSubmitting] = useActionState<RegisterState, FormData>(
    registerAction,
    null,
  );
  const [password, setPassword] = useState("");

  // Surface the Server Action outcome as a toast.
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("¡Cuenta creada! Redirigiendo…");
    } else {
      toast.error(state.error ?? "Error al crear la cuenta");
    }
  }, [state]);

  // On successful registration we land authenticated — bounce to `/`.
  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
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
  const hasError = state && !state.success;

  return (
    <main className="flex min-h-screen">
      {/* Left panel — branding (hidden on mobile, visible on md+) */}
      <div className="relative hidden w-1/2 bg-primary md:flex md:items-center md:justify-center md:p-12">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 mx-auto max-w-md space-y-4 text-center text-primary-foreground">
          <GalleryVerticalEnd className="mx-auto size-12" />
          <h1 className="text-3xl font-bold tracking-tight">Booking Engine</h1>
          <p className="text-lg leading-relaxed text-primary-foreground/80">
            Gestioná tus turnos, pacientes y profesionales desde un solo lugar.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-background p-6 md:w-1/2 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo visible on mobile only */}
          <div className="flex justify-center md:hidden">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-6" />
            </div>
          </div>

          <header className="space-y-2 text-center md:text-left">
            <h1 className="text-2xl font-bold text-foreground">Creá tu cuenta</h1>
            <p className="text-sm text-muted-foreground">
              Registrate como paciente para reservar turnos.
            </p>
          </header>

          <form action={formAction} className="space-y-5" noValidate>
            {/* Name field */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Nombre completo
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  className={`flex h-10 w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    hasError ? "border-destructive focus-visible:ring-destructive/30" : "border-input"
                  }`}
                />
              </div>
              <div className="min-h-[1.25rem]">
                {hasError ? (
                  <p className="text-xs text-destructive">{state.error}</p>
                ) : null}
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`flex h-10 w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    hasError ? "border-destructive focus-visible:ring-destructive/30" : "border-input"
                  }`}
                />
              </div>
              <div className="min-h-[1.25rem]">
                {hasError ? (
                  <p className="text-xs text-destructive">{state.error}</p>
                ) : null}
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`flex h-10 w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    hasError ? "border-destructive focus-visible:ring-destructive/30" : "border-input"
                  }`}
                />
              </div>
              {password.length > 0 ? (
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
              ) : (
                <div className="min-h-[1.25rem]" />
              )}
              {hasError ? (
                <p className="text-xs text-destructive">{state.error}</p>
              ) : null}
            </div>

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
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
