/**
 * Dashboard site header — breadcrumb + sidebar trigger.
 *
 * Server Component: no client state needed. When no `crumbs` prop is
 * passed the header mounts the route-derived `<DashboardBreadcrumbs />`
 * client leaf (slice 3a); explicit `crumbs` arrays still render as
 * before for callers that want a static trail.
 */

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";

interface Crumb {
  label: string;
  href?: string;
}

interface SiteHeaderProps {
  crumbs?: Crumb[];
}

export function SiteHeader({ crumbs = [] }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {crumbs.length === 0 ? (
          <DashboardBreadcrumbs />
        ) : (
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                return (
                  <span key={`${crumb.label}-${index}`} className="contents">
                    <BreadcrumbItem>
                      {isLast || !crumb.href ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  );
}
