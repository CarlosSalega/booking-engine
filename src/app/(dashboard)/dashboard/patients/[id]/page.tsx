/**
 * `/dashboard/patients/[id]` — operator-facing detail view for one patient.
 *
 * Server Component. Responsibilities (enforced server-side, never trust
 * the client):
 * 1. Read `params.id` from the dynamic route.
 * 2. Resolve `organizationId` from the active org cookie.
 * 3. Fetch the patient with `getPatientById(orgId, id)` — this returns
 *    `null` when the patient is in a different org, so cross-tenant
 *    access is silently blocked.
 * 4. Fetch the patient's booking history with
 *    `getBookings(orgId, { patientId })` (AD5 — patientId filter).
 * 5. `null` from `getPatientById` → `notFound()` (404).
 * 6. Hand the enriched patient + booking history to the
 *    `<PatientDetail>` Client Component, which owns the visual
 *    presentation + the status change dropdown.
 *
 * The page itself is intentionally thin: the data layer owns scoping
 * and 404 semantics; the Client Component owns rendering.
 */

import { notFound } from "next/navigation";

import { getOrganizationId } from "@/modules/dashboard";
import { getPatientById, type EnrichedPatient } from "@/modules/patients";
import { getBookings } from "@/modules/bookings";
import type { EnrichedBooking } from "@/modules/bookings/data/booking-data.types";

import { PatientDetail } from "@/components/patients/patient-detail";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const patient = await getPatientById(organizationId, id);

  if (!patient) {
    // Patient doesn't exist or belongs to a different org → 404.
    notFound();
  }

  // Booking history for this patient (AD5 — patientId filter on
  // getBookings). The data layer translates `patientId` into a
  // `WHERE patientId` clause.
  const bookingsResult = await getBookings(organizationId, { patientId: id });

  return (
    <PatientDetail
      patient={patient as EnrichedPatient}
      bookings={bookingsResult.bookings as EnrichedBooking[]}
    />
  );
}
