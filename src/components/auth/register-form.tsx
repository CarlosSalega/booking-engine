/**
 * `RegisterForm` — Client Component for `/register`.
 *
 * Slice 1b of the UX/A11y audit fixes. The form:
 *   - Renders exactly one `<h1>` ("Creá tu cuenta"); the
 *     "Booking Engine" wordmark is a `<p>` non-heading element.
 *   - On failed submit, PER-FIELD errors are rendered (one per
 *     field): `#name-error`, `#email-error`, `#password-error`, each
 *     with `role="alert"`. Each invalid input carries
 *     `aria-invalid="true"` and `aria-describedby` referencing its
 *     error id.
 *   - On failed submit, focus moves to the FIRST invalid field
 *     (name → email → password order).
 *   - The password field carries a strength hint with a stable id
 *     (`#password-hint`) so its `aria-describedby` references both
 *     the hint and the error node when both are visible.
 *   - Exposes a password-visibility toggle with `aria-pressed`,
 *     Spanish `aria-label` ("Mostrar contraseña"/"Ocultar contraseña"),
 *     and a keyboard-reachable `<button type="button">`.
 *   - Inputs adopt the project iOS-safe sizing convention
 *     (`h-11 text-base md:text-sm`); the className is built with
 *     `cn()` instead of a template literal.
 *   - `noValidate` stays — custom programmatic validation throughout.
 *
 * Why per-field errors on register (vs login's form-level alert):
 * register has genuinely per-field failure modes (empty name,
 * invalid email format, short password) and a single alert would
 * force screen-reader users to hunt for the failing field. The
 * design keeps one error idiom across the auth forms: login uses
 * form-level because its only failure is a credential error that
 * applies to both fields.
 *
 * Why client-side validation runs before `signUp.email`: the server
 * call is the expensive path. A short password or invalid email
 * format should fail fast, without hitting the API. Server failures
 * (e.g. "email already in use") attach to the email field with a
 * localized message.
 */

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GalleryVerticalEnd,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { createAuthClient } from "@/core/auth/auth-client";

const authClient = createAuthClient();

// ---------------------------------------------------------------------------
// Shared input className (slice 1b sizing convention)
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

// Stable error ids — referenced by `aria-describedby` and the test file.
const NAME_ERROR_ID = "name-error";
const EMAIL_ERROR_ID = "email-error";
const PASSWORD_ERROR_ID = "password-error";
const PASSWORD_HINT_ID = "password-hint";

// ---------------------------------------------------------------------------
// Per-field validation
// ---------------------------------------------------------------------------
// Lightweight email regex — same shape as login's server-side
// validation, kept in sync via shared feedback copy.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name: string | null;
  email: string | null;
  password: string | null;
};

function validateClientSide(
  name: string,
  email: string,
  password: string,
): FieldErrors {
  const errors: FieldErrors = { name: null, email: null, password: null };
  if (!name.trim()) errors.name = "Ingresá tu nombre";
  if (!email.trim()) errors.email = "Ingresá tu email";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Email inválido";
  if (!password) errors.password = "Ingresá una contraseña";
  else if (password.length < 8)
    errors.password = "La contraseña debe tener al menos 8 caracteres";
  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    name: null,
    email: null,
    password: null,
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const passwordLongEnough = password.length >= 8;
  const passwordHintText =
    password.length > 0
      ? passwordLongEnough
        ? "✓ Al menos 8 caracteres"
        : "Mínimo 8 caracteres"
      : null;

  // Per-input className — error variant overrides border + focus ring.
  function inputClassName(hasError: boolean) {
    return cn(
      INPUT_CLASS_BASE,
      "h-11",
      hasError ? INPUT_CLASS_ERROR : INPUT_CLASS_NORMAL,
    );
  }

  // Compose `aria-describedby` from the hint id (when shown) + the
  // error id (when set). Both nodes exist in the DOM only when their
  // ids are referenced here, so the reference list never points at
  // missing nodes.
  function passwordDescribedBy() {
    return [
      fieldErrors.password ? PASSWORD_ERROR_ID : null,
      passwordHintText ? PASSWORD_HINT_ID : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  }

  // Move focus to the first invalid field in name → email → password
  // order. Called after a failed client-side validation or after a
  // server rejection (where the server error is attached to email).
  function focusFirstInvalid(errors: FieldErrors) {
    if (errors.name) nameRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({ name: null, email: null, password: null });

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString() ?? "";
    const email = formData.get("email")?.toString() ?? "";
    const passwordValue = formData.get("password")?.toString() ?? "";

    // Client-side validation — fail fast before hitting the API.
    const clientErrors = validateClientSide(name, email, passwordValue);
    if (clientErrors.name || clientErrors.email || clientErrors.password) {
      setFieldErrors(clientErrors);
      setIsSubmitting(false);
      focusFirstInvalid(clientErrors);
      return;
    }

    const result = await authClient.signUp.email({
      name,
      email,
      password: passwordValue,
    });

    if (result.error) {
      // Server-side failure — most signUp errors point at the email
      // (already in use, blocked domain, etc.), so attach the error
      // there and focus the email input.
      const serverErrors: FieldErrors = {
        name: null,
        email: "No pudimos crear la cuenta con ese email",
        password: null,
      };
      setFieldErrors(serverErrors);
      toast.error("Error al crear la cuenta");
      setIsSubmitting(false);
      focusFirstInvalid(serverErrors);
      return;
    }

    toast.success("¡Cuenta creada! Redirigiendo…");
    router.replace("/dashboard");
  }

  const nameClass = inputClassName(Boolean(fieldErrors.name));
  const emailClass = inputClassName(Boolean(fieldErrors.email));
  const passwordClass = cn(
    inputClassName(Boolean(fieldErrors.password)),
    showPassword ? "pr-10" : "pr-3",
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
              Creá tu cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              Registrate como paciente para reservar turnos.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthField
              id="name"
              label="Nombre completo"
              required
              error={fieldErrors.name}
              errorId={NAME_ERROR_ID}
            >
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={nameRef}
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  aria-invalid={fieldErrors.name ? true : undefined}
                  aria-describedby={
                    fieldErrors.name ? NAME_ERROR_ID : undefined
                  }
                  className={nameClass}
                />
              </div>
            </AuthField>

            <AuthField
              id="email"
              label="Email"
              required
              error={fieldErrors.email}
              errorId={EMAIL_ERROR_ID}
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={
                    fieldErrors.email ? EMAIL_ERROR_ID : undefined
                  }
                  className={emailClass}
                />
              </div>
            </AuthField>

            <AuthField
              id="password"
              label="Contraseña"
              required
              error={fieldErrors.password}
              errorId={PASSWORD_ERROR_ID}
            >
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={passwordDescribedBy()}
                  className={passwordClass}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
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
              {passwordHintText ? (
                <p
                  id={PASSWORD_HINT_ID}
                  className={
                    passwordLongEnough
                      ? "text-xs text-primary"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {passwordHintText}
                </p>
              ) : null}
            </AuthField>

            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}