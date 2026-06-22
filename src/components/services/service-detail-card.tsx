/**
 * `ServiceDetailCard` — the full detail view for a single service.
 *
 * Renders the service's enriched data (name, description, duration,
 * price, payment type, deposit, status, professional) in a card-
 * based layout. The status change dropdown is a small sub-component
 * that owns the Server Action wiring.
 *
 * Client Component: the parent page is a Server Component, but the
 * status change dropdown needs `useTransition` + `useRouter` so we
 * land on the client from the top. This lets the data the page
 * passed via props stay serializable through the Server → Client
 * boundary.
 *
 * RBAC scoping: the component does NOT enforce any role check. The
 * Server Component page (`[id]/page.tsx`) calls `getServiceById`
 * and 404s when the service is not in the org. PATIENT users cannot
 * reach this page at all (dashboard layout redirects them).
 *
 * The `canEdit` prop hides the "Editar" button for PROFESSIONAL
 * users. The page reads the session role and passes the boolean
 * down — we don't fetch the session from the client.
 */

"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CircleDollarSign,
  Clock,
  Edit,
  StickyNote,
  Tag,
  User,
} from "lucide-react";

import type { EnrichedService } from "@/modules/services/data/service-data.types";
import {
  formatPrice,
  getPaymentTypeLabel,
  getServiceStatusLabel,
} from "@/modules/services/presentation/formatters";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ServiceStatusBadge } from "./service-status-badge";
import { ServiceStatusChangeDropdown } from "./service-status-change-dropdown";

interface ServiceDetailCardProps {
  service: EnrichedService;
  canEdit: boolean;
}

export function ServiceDetailCard({ service, canEdit }: ServiceDetailCardProps) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header — back link + service name + status badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1"
            aria-label="Volver al listado"
          >
            <Link href="/dashboard/services">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {service.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {getServiceStatusLabel(service.status)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ServiceStatusBadge status={service.status} />
        </div>
      </div>

      {/* Info cards — 2-column on desktop, single column on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard title="Información general">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{service.name}</span>
            </div>
            {service.description ? (
              <div className="flex items-start gap-2 text-muted-foreground">
                <StickyNote
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="whitespace-pre-wrap">{service.description}</p>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-3.5" aria-hidden="true" />
              <span>
                {service.durationMinutes} minutos
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-3.5" aria-hidden="true" />
              <span>{service.professionalName}</span>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Precio y pago">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CircleDollarSign
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="font-medium tabular-nums">
                {service.price ? formatPrice(service.price.amount) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="size-3.5" aria-hidden="true" />
              <span>{getPaymentTypeLabel(service.paymentType)}</span>
            </div>
            {service.paymentType === "DEPOSIT" && service.depositAmount ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs uppercase tracking-wide">Seña</span>
                <span className="tabular-nums">
                  {formatPrice(service.depositAmount.amount)}
                </span>
              </div>
            ) : null}
          </div>
        </InfoCard>

        <InfoCard title="Estado">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Actual</span>
              <ServiceStatusBadge status={service.status} />
            </div>
            <ServiceStatusChangeDropdown
              serviceId={service.id}
              currentStatus={service.status}
            />
          </div>
        </InfoCard>

        <InfoCard title="Auditoría">
          <div className="space-y-1 text-sm">
            <p className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{service.id}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Creado:{" "}
              <span className="font-medium">
                {service.createdAt.toLocaleDateString("es-AR")}
              </span>
            </p>
          </div>
        </InfoCard>
      </div>

      {/* Action bar — Edit button (hidden for PROFESSIONAL) */}
      {canEdit ? (
        <div className="flex justify-end border-t pt-4">
          <Button asChild>
            <Link
              href={`/dashboard/services/${service.id}/edit`}
              className="gap-1.5"
            >
              <Edit className="size-4" />
              Editar servicio
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoCard — small wrapper that keeps the info cards visually identical.
// ---------------------------------------------------------------------------

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function InfoCard({ title, children, className }: InfoCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
