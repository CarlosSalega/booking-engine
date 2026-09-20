"use client";

/**
 * Dashboard breadcrumbs — route-derived trail.
 *
 * Reads `usePathname()` from `next/navigation` and maps each segment
 * against an es-AR label dictionary. The last segment is always the
 * current (non-linked) leaf; every parent segment renders as an anchor
 * pointing at its cumulative path.
 *
 * Label map contract:
 *  - `dashboard` → "Dashboard"
 *  - Known entity containers (`bookings`, `calendar`, `patients`,
 *    `payments`, `professionals`, `services`, `settings`) → Spanish label.
 *  - An unmapped segment whose IMMEDIATE PARENT is one of the entity
 *    containers is treated as a dynamic `[id]` and rendered as
 *    "Detalle" plain text.
 *  - Any other unmapped segment falls back to its raw URL value so the
 *    trail never breaks.
 *
 * Client isolation: this file ships as a small client island inside the
 * server-rendered `SiteHeader`. The header itself stays a Server
 * Component (see `site-header.tsx`).
 */

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * es-AR label dictionary for known dashboard segments.
 *
 * Keys are URL segments (the literal value that appears in the path);
 * values are the human-readable labels rendered to the user. Adding a
 * new segment here is the only change required to label a new route.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  bookings: "Turnos",
  calendar: "Calendario",
  patients: "Pacientes",
  payments: "Pagos",
  professionals: "Profesionales",
  services: "Servicios",
  settings: "Configuración",
};

/**
 * Segments that own a dynamic `[id]` child route. The child is
 * rendered as "Detalle" plain text when the dictionary misses.
 * `dashboard` is intentionally excluded — it has no detail page.
 */
const ENTITY_SEGMENTS = new Set([
  "bookings",
  "calendar",
  "patients",
  "payments",
  "professionals",
  "services",
  "settings",
]);

/**
 * Resolves a single segment to its display label.
 *
 * Public for testing and for callers that want the same mapping outside
 * of the React tree. Pure function — easy to assert.
 */
export function resolveSegmentLabel(segment: string, parent: string | null): string {
  const mapped = SEGMENT_LABELS[segment];
  if (mapped) return mapped;
  if (parent && ENTITY_SEGMENTS.has(parent)) return "Detalle";
  return segment;
}

/**
 * Splits a pathname into display-ready trail entries.
 *
 * The leading `/` and the optional trailing slash are ignored. The root
 * `/` renders nothing (the dashboard layout always nests under
 * `/dashboard/...`).
 *
 * Each entry carries:
 *  - `label`: the Spanish label or raw fallback
 *  - `href`: cumulative path up to AND INCLUDING that segment; empty
 *    for the leaf (it carries `aria-current="page"` instead).
 */
export interface BreadcrumbEntry {
  label: string;
  href: string;
  isLeaf: boolean;
}

export function buildTrail(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  return segments.map((segment, index) => {
    const isLeaf = index === segments.length - 1;
    const parent = index > 0 ? segments[index - 1]! : null;
    const href = "/" + segments.slice(0, index + 1).join("/");
    return {
      label: resolveSegmentLabel(segment, parent),
      href,
      isLeaf,
    };
  });
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname() ?? "/";
  const trail = buildTrail(pathname);

  if (trail.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((entry, index) => (
          <span
            key={`${entry.href}-${index}`}
            className="contents"
          >
            <BreadcrumbItem>
              {entry.isLeaf ? (
                <BreadcrumbPage>{entry.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={entry.href}>
                  {entry.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < trail.length - 1 ? <BreadcrumbSeparator /> : null}
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
