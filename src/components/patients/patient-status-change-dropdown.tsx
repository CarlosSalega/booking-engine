/**
 * `PatientStatusChangeDropdown` — a small Client Component that
 * renders a dropdown to change a patient's status. Wired to the
 * `changePatientStatus` Server Action via `useTransition` so the
 * page can revalidate on success.
 *
 * Pattern mirrors the bookings `BookingDetailActions` sub-component:
 * - useTransition provides the loading state
 * - On success, toast + router.refresh() so the page re-fetches
 * - On error, toast the action's Spanish error message
 *
 * Three statuses (ACTIVE / INACTIVE / BLOCKED). The current status
 * is disabled in the dropdown so the user can't select the same
 * status they're already on.
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { changePatientStatus } from "@/modules/patients/actions";
import { PatientStatus, type PatientStatusType } from "@/modules/patients/domain/patient";
import { getPatientStatusLabel } from "@/modules/patients/presentation/formatters";

import { Button } from "@/components/ui/button";

interface PatientStatusChangeDropdownProps {
  patientId: string;
  currentStatus: PatientStatusType;
}

const ALL_STATUSES: PatientStatusType[] = [
  PatientStatus.ACTIVE,
  PatientStatus.INACTIVE,
  PatientStatus.BLOCKED,
];

export function PatientStatusChangeDropdown({
  patientId,
  currentStatus,
}: PatientStatusChangeDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: PatientStatusType) {
    if (next === currentStatus) return;
    startTransition(async () => {
      try {
        const result = await changePatientStatus({ id: patientId, status: next });
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
    <div className="flex flex-wrap gap-2" data-testid="patient-status-change">
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
            {getPatientStatusLabel(status)}
          </Button>
        );
      })}
    </div>
  );
}
