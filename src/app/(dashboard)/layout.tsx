/**
 * /dashboard layout — sidebar + main shell.
 *
 * RBAC gate: PATIENT users cannot access the dashboard. They are
 * redirected to the public landing page (`/`). Better Auth's
 * `proxy.ts` already enforces authentication at the routing layer,
 * so by the time this layout runs the user is guaranteed to be
 * signed in.
 *
 * Wraps every nested page in a SidebarProvider so the sidebar can
 * collapse on tablet/mobile and persist its state via cookie.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth-instance";
import { USER_ROLE } from "@/modules/auth/domain/roles";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as typeof session.user & { role?: string };
  if (user.role === USER_ROLE.PATIENT) {
    redirect("/");
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <DashboardSidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role ?? USER_ROLE.PATIENT,
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
