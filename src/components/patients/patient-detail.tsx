/**
 * `PatientDetail` — the full detail view for a single patient.
 *
 * Renders the patient's enriched data (fullName, email, phone,
 * documentId, status, notes, audit info) in a card-based layout.
 * The status change dropdown is a small sub-component that owns
 * the Server Action wiring. The booking history is shown below
 * the info cards.
 *
 * Client Component (the parent page is a Server Component, but
 * the status change dropdown needs `useTransition` + `useRouter`
 * so we land on the client from the top — this lets the data the
 * page passed via props stay serializable through the Server →
 * Client boundary).
 *
 * RBAC scoping: this component does NOT enforce any role check.
 * The Server Component page (`[id]/page.tsx`) calls
 * `getPatientById(orgId, id)` and 404s when the patient is not in
 * the org. PATIENT users cannot reach this page at all (dashboard
 * layout redirects them).
 *
 * Pure presentational (apart from the status change dropdown): no
 * data fetching, no auth, no router mutation outside the dropdown.
 */

"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Mail, Phone, StickyNote, User } from "lucide-react";

import type { EnrichedPatient } from "@/modules/patients/data/patient-data.types";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { PatientStatusBadge } from "./patient-status-badge";
import { PatientStatusChangeDropdown } from "./patient-status-change-dropdown";
import { PatientBookingHistory } from "./patient-booking-history";

interface PatientDetailProps {
  patient: EnrichedPatient;
  bookings: EnrichedBooking[];
}

export function PatientDetail({ patient, bookings }: PatientDetailProps) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header — back link + patient name + status badge */}
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
            <Link href="/dashboard/patients">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {patient.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {patient.email || "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PatientStatusBadge status={patient.status} />
        </div>
      </div>

      {/* Info cards — 2-column on desktop, single column on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard title="Información personal">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="font-medium">{patient.fullName}</span>
            </div>
            {patient.email ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5" aria-hidden="true" />
                <span>{patient.email}</span>
              </div>
            ) : null}
            {patient.phone ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5" aria-hidden="true" />
                <span>{patient.phone}</span>
              </div>
            ) : null}
            {patient.documentId ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs uppercase tracking-wide">DNI</span>
                <span className="tabular-nums">{patient.documentId}</span>
              </div>
            ) : null}
          </div>
        </InfoCard>

        <InfoCard title="Auditoría">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Creado por </span>
              <span className="font-medium">
                {patient.createdByUserName || "—"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{patient.id}</span>
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Estado">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Actual</span>
              <PatientStatusBadge status={patient.status} />
            </div>
            <PatientStatusChangeDropdown
              patientId={patient.id}
              currentStatus={patient.status}
            />
          </div>
        </InfoCard>

        {patient.notes ? (
          <InfoCard title="Notas" className="md:col-span-2">
            <div className="flex items-start gap-2 text-sm">
              <StickyNote
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="whitespace-pre-wrap">{patient.notes}</p>
            </div>
          </InfoCard>
        ) : null}
      </div>

      {/* Booking history */}
      <div className="space-y-3">
        <h2 className="text-base font-medium">Historial de turnos</h2>
        <PatientBookingHistory bookings={bookings} />
      </div>

      {/* Action bar */}
      <div className="flex justify-end border-t pt-4">
        <Button asChild>
          <Link href={`/dashboard/patients/${patient.id}/edit`} className="gap-1.5">
            <Edit className="size-4" />
            Editar paciente
          </Link>
        </Button>
      </div>
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
