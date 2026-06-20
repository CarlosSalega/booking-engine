"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { createAuthClient } from "@/core/auth/auth-client";

const authClient = createAuthClient();

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }

    toast.success("¡Bienvenido! Redirigiendo…");
    router.replace("/dashboard");
  }

  return (
    <main className="flex min-h-screen">
      {/* Left panel — branding */}
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
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
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
                    error ? "border-destructive focus-visible:ring-destructive/30" : "border-input"
                  }`}
                />
              </div>
              <div className="min-h-[1.25rem]">
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={`flex h-10 w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    error ? "border-destructive focus-visible:ring-destructive/30" : "border-input"
                  }`}
                />
              </div>
              <div className="min-h-[1.25rem]">
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
              </div>
            </div>

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
