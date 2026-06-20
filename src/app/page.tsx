/**
 * Public landing / root entry point.
 *
 * - Unauthenticated users see a minimal landing and a link to /login.
 * - Authenticated non-PATIENT users (ADMIN, SECRETARY, PROFESSIONAL)
 *   are bounced to /dashboard so the operator panel is the first
 *   thing they see.
 * - PATIENT users stay on this page — they do not have access to the
 *   dashboard. A real patient-facing landing will replace this in a
 *   later change.
 *
 * Auth is enforced at the routing layer by `src/app/proxy.ts`, which
 * redirects unauthenticated requests to /login. This page is reached
 * only when there is a valid session, so we don't re-check.
 */

import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain/roles";

import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role !== USER_ROLE.PATIENT) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Booking Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          Plataforma de reservas y gestión para consultorios.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {session ? (
          <Button asChild>
            <Link href="/login">Cerrar sesión e ingresar con otra cuenta</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
