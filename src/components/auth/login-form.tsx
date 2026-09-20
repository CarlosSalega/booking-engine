/**
 * `LoginForm` — Client Component for `/login`.
 *
 * Slice 1a of the UX/A11y audit fixes. The form:
 *   - Renders exactly one `<h1>` ("Bienvenido de nuevo"); the
 *     "Booking Engine" wordmark is a `<p>` non-heading element.
 *   - On credential failure (signIn.email returns `error`), a single
 *     form-level alert (`#login-form-error[role=alert][tabindex=-1]`)
 *     is rendered; both inputs get `aria-invalid="true"` and
 *     `aria-describedby="login-form-error"`. Focus moves to the alert
 *     so screen-reader users hear the error immediately.
 *   - Exposes a password-visibility toggle with `aria-pressed`,
 *     Spanish `aria-label` ("Mostrar contraseña"/"Ocultar contraseña"),
 *     and a keyboard-reachable `<button type="button">`.
 *   - Inputs adopt the project iOS-safe sizing convention
 *     (`h-11 text-base md:text-sm`); the className is built with `cn()`
 *     instead of a template literal.
 *   - `noValidate` stays — custom programmatic validation throughout.
 *
 * Why `cn()` over template literals: removes the dead conditional-class
 * branches (`border-input` was never reachable when an error was set)
 * and keeps the className readable.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd, Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { createAuthClient } from "@/core/auth/auth-client";

const authClient = createAuthClient();

// ---------------------------------------------------------------------------
// Shared input className (slice 1a sizing convention)
// ---------------------------------------------------------------------------
// `h-11` (44px touch target) + `text-base md:text-sm` (iOS-safe 16px on
// mobile to prevent auto-zoom, smaller on ≥md). The `pl-10` reserves
// room for the leading icon; the toggle adds `pr-10` only on the
// password input. The error variant swaps the border + focus ring for
// the destructive variant.

const INPUT_CLASS_BASE =
  "flex w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const INPUT_CLASS_NORMAL = "border-input focus-visible:ring-ring/50";
const INPUT_CLASS_ERROR =
  "border-destructive focus-visible:ring-destructive/30";

const FORM_ERROR_ID = "login-form-error";

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const formErrorRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the form-level alert whenever an error appears so
  // screen readers announce it. Runs after the error state commits and
  // the <p> mounts/updates.
  useEffect(() => {
    if (error) formErrorRef.current?.focus();
  }, [error]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    const result = await authClient.signIn.email({ email, password });

    if (result.error) {
      setError("Credenciales inválidas");
      toast.error("Credenciales inválidas");
      setIsSubmitting(false);
      // Focus moves to the alert via the useEffect above once the
      // <p role="alert"> commits; calling focus() here would race
      // the ref attachment.
      return;
    }

    toast.success("¡Bienvenido! Redirigiendo…");
    router.replace("/dashboard");
  }

  const hasError = Boolean(error);
  const inputClassName = cn(
    INPUT_CLASS_BASE,
    hasError ? INPUT_CLASS_ERROR : INPUT_CLASS_NORMAL,
  );

  return (
    <main className="flex min-h-screen">
      {/* Left panel — branding (wordmark is a <p>, NOT a heading) */}
      <div className="relative hidden w-1/2 bg-primary md:flex md:items-center md:justify-center md:p-12">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 mx-auto max-w-md space-y-4 text-center text-primary-foreground">
          <GalleryVerticalEnd className="mx-auto size-12" />
          <p className="text-3xl font-bold tracking-tight">Booking Engine</p>
          <p className="text-lg leading-relaxed text-primary-foreground/80">
            Gestioná tus turnos, pacientes y profesionales desde un solo lugar.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-background p-6 md:w-1/2 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center md:hidden">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-6" />
            </div>
          </div>

          <header className="space-y-2 text-center md:text-left">
            <h1 className="text-2xl font-bold text-foreground">
              Bienvenido de nuevo
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresá con tu email y contraseña para continuar.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthField id="email" label="Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={hasError ? true : undefined}
                  aria-describedby={hasError ? FORM_ERROR_ID : undefined}
                  className={cn(inputClassName, "h-11")}
                />
              </div>
            </AuthField>

            <AuthField id="password" label="Contraseña" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  aria-invalid={hasError ? true : undefined}
                  aria-describedby={hasError ? FORM_ERROR_ID : undefined}
                  className={cn(inputClassName, "h-11", showPassword ? "pr-10" : "pr-3")}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </AuthField>

            {hasError ? (
              <p
                ref={formErrorRef}
                id={FORM_ERROR_ID}
                role="alert"
                tabIndex={-1}
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}