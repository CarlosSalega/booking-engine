/**
 * `ProfessionalDetailCard` — the full detail view for a single
 * professional.
 *
 * Renders the professional's enriched data (name, email, specialties
 * as chips, license, bio, status) in a card-based layout. The status
 * change dropdown is a small sub-component that owns the Server Action
 * wiring. An "Editar" button is shown when `canEdit` is true
 * (ADMIN / SECRETARY roles).
 *
 * Client Component: the parent page is a Server Component, but the
 * status change dropdown needs `useTransition` + `useRouter` so we
 * land on the client from the top. This lets the data the page
 * passed via props stay serializable through the Server → Client
 * boundary.
 *
 * RBAC scoping: the component does NOT enforce any role check. The
 * Server Component page (`[id]/page.tsx`) calls `getProfessionalById`
 * and 404s when the professional is not in the org. PATIENT users
 * cannot reach this page at all (dashboard layout redirects them).
 *
 * The `canEdit` prop hides the "Editar" button AND the status change
 * dropdown for PROFESSIONAL users (read-only per AD3). The page
 * reads the session role and passes the boolean down — we don't
 * fetch the session from the client.
 */

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Edit,
  Mail,
  Stethoscope,
  StickyNote,
  User as UserIcon,
} from "lucide-react";

import type { EnrichedProfessional } from "@/modules/professionals/data/professional-data.types";
import {
  ProfessionalStatus,
  type ProfessionalStatusType,
} from "@/modules/professionals/domain/professional";
import { getProfessionalStatusLabel } from "@/modules/professionals/presentation/formatters";
import { changeProfessionalStatus } from "@/modules/professionals/actions";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { ProfessionalStatusBadge } from "./professional-status-badge";

interface ProfessionalDetailCardProps {
  professional: EnrichedProfessional;
  canEdit: boolean;
}

const NULL_PLACEHOLDER = "—";

export function ProfessionalDetailCard({
  professional,
  canEdit,
}: ProfessionalDetailCardProps) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header — back link + professional name + status badge */}
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
            <Link href="/dashboard/professionals">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {professional.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {getProfessionalStatusLabel(professional.status)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProfessionalStatusBadge status={professional.status} />
        </div>
      </div>

      {/* Info cards — 2-column on desktop, single column on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard title="Información general">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {professional.image ? (
                <AvatarImage src={professional.image} alt={professional.fullName} />
              ) : null}
              <AvatarFallback>
                {initialsFor(professional.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{professional.fullName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5" aria-hidden="true" />
                <span>{professional.email}</span>
              </div>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Especialidades">
          {professional.specialties.length === 0 ? (
            <p className="text-sm text-muted-foreground">{NULL_PLACEHOLDER}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {professional.specialties.map((specialty) => (
                <Badge
                  key={specialty}
                  variant="secondary"
                  className="gap-1 px-2 py-0.5 text-xs"
                >
                  <Stethoscope className="size-3" aria-hidden="true" />
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
        </InfoCard>

        <InfoCard title="Matrícula">
          <div className="space-y-2 text-sm">
            <p className="font-medium tabular-nums">
              {professional.license ?? NULL_PLACEHOLDER}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Estado">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Actual</span>
              <ProfessionalStatusBadge status={professional.status} />
            </div>
            {canEdit ? (
              <ProfessionalStatusChangeDropdown
                professionalId={professional.id}
                currentStatus={professional.status}
              />
            ) : null}
          </div>
        </InfoCard>

        <div className="md:col-span-2">
          <InfoCard title="Bio">
            <div className="space-y-2 text-sm">
              {professional.bio ? (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <StickyNote
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="whitespace-pre-wrap">{professional.bio}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">{NULL_PLACEHOLDER}</p>
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      {/* Action bar — Edit button (hidden when canEdit is false) */}
      {canEdit ? (
        <div className="flex justify-end border-t pt-4">
          <Button asChild>
            <Link
              href={`/dashboard/professionals/${professional.id}/edit`}
              className="gap-1.5"
            >
              <Edit className="size-4" />
              Editar profesional
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

// ---------------------------------------------------------------------------
// ProfessionalStatusChangeDropdown — small sub-component that wires the
// status-change action. Mirrors the services `ServiceStatusChangeDropdown`
// pattern.
// ---------------------------------------------------------------------------

const ALL_STATUSES: ProfessionalStatusType[] = [
  ProfessionalStatus.ACTIVE,
  ProfessionalStatus.INACTIVE,
];

interface ProfessionalStatusChangeDropdownProps {
  professionalId: string;
  currentStatus: ProfessionalStatusType;
}

function ProfessionalStatusChangeDropdown({
  professionalId,
  currentStatus,
}: ProfessionalStatusChangeDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: ProfessionalStatusType) {
    if (next === currentStatus) return;
    startTransition(async () => {
      try {
        const result = await changeProfessionalStatus({
          id: professionalId,
          status: next,
        });
        if (result.success) {
          toast.success("Estado actualizado");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("No se pudo actualizar el estado. Intentá de nuevo.");
      }
    });
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      data-testid="professional-status-change"
    >
      {ALL_STATUSES.map((status) => {
        const isCurrent = status === currentStatus;
        return (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={isCurrent ? "default" : "outline"}
            disabled={isPending || isCurrent}
            onClick={() => handleChange(status)}
            data-status={status}
          >
            {getProfessionalStatusLabel(status)}
          </Button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// initialsFor — derive a 2-letter avatar fallback from the full name.
// "Dr. García" → "DG", "Dra. María López" → "DL".
// ---------------------------------------------------------------------------

function initialsFor(fullName: string): string {
  const parts = fullName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}
