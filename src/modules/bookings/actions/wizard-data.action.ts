"use server";

/**
 * Server Actions backing the booking wizard's data fetches.
 *
 * The wizard page is a Client Component (it needs `useState`,
 * `useEffect`, and the Zustand store). The data layer
 * (`@/modules/bookings/data/*`) is server-only — it imports
 * `@/lib/prisma` and can't be called from the client. These thin
 * `"use server"` wrappers expose the four data functions the wizard
 * needs to the client side.
 *
 * All four actions resolve `organizationId` server-side via
 * `getOrganizationId()` — the wizard doesn't need to know which org
 * is active. RBAC for mutations is enforced in the `createBooking`
 * action; these data fetches are read-only and safe for any
 * ADMIN/SECRETARY/PROFESSIONAL viewer (PATIENT is blocked at the
 * dashboard layout).
 *
 * Date / time shape: the data layer returns `Date` objects; the
 * server-action boundary serializes them to ISO strings. The wizard
 * step components can call `new Date(iso)` to render them — or
 * format directly with the existing formatters.
 */

import { getOrganizationId } from "@/modules/dashboard";

import { getAvailableSlots } from "../data/booking-availability";
import {
  getPatients,
  getProfessionalsForService,
  getServices,
} from "../data/booking-data";
import type { AvailableSlot } from "../data/booking-availability";
import type {
  PatientOption,
  ProfessionalOption,
  ServiceOption,
} from "../data/booking-data.types";

// ---------------------------------------------------------------------------
// Step 1 — services (no input)
// ---------------------------------------------------------------------------

/** Fetch the org's ACTIVE services for wizard step 1. */
export async function getServicesForWizard(): Promise<ServiceOption[]> {
  const organizationId = await getOrganizationId();
  return getServices(organizationId);
}

// ---------------------------------------------------------------------------
// Step 2 — professionals for a service
// ---------------------------------------------------------------------------

/**
 * Fetch the ACTIVE professionals who offer a given service, for
 * wizard step 2. Returns an empty list when the service id is empty
 * (so the client can call this eagerly while the user is still on
 * step 1 without seeing errors).
 */
export async function getProfessionalsForWizard(
  serviceId: string,
): Promise<ProfessionalOption[]> {
  if (!serviceId) return [];
  const organizationId = await getOrganizationId();
  return getProfessionalsForService(organizationId, serviceId);
}

// ---------------------------------------------------------------------------
// Step 3 — available slots
// ---------------------------------------------------------------------------

/**
 * Fetch the open 30-min slots for a given (professional, service,
 * date). `date` is a `Date` object — server actions serialize Date
 * parameters, so callers can pass `new Date("2026-06-20")` directly.
 *
 * Returns an empty list when any required id is empty (the step 3
 * component fires this on date change and on mount).
 */
export async function getAvailableSlotsForWizard(
  professionalId: string,
  serviceId: string,
  date: Date,
): Promise<AvailableSlot[]> {
  if (!professionalId || !serviceId) return [];
  const organizationId = await getOrganizationId();
  return getAvailableSlots(organizationId, professionalId, serviceId, date);
}

// ---------------------------------------------------------------------------
// Step 4 — patients (search)
// ---------------------------------------------------------------------------

/**
 * Fetch the org's ACTIVE patients, optionally filtered by a search
 * term (matches name or email). The step 4 component fires this on
 * mount (empty search → all patients, capped at 20) and on each
 * debounced keystroke.
 */
export async function getPatientsForWizard(
  search?: string,
): Promise<PatientOption[]> {
  const organizationId = await getOrganizationId();
  return getPatients(organizationId, search);
}
