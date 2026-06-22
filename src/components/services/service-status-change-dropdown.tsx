/**
 * `ServiceStatusChangeDropdown` — a small Client Component that
 * renders a dropdown to change a service's status. Wired to the
 * `changeServiceStatus` Server Action via `useTransition` so the
 * page can revalidate on success.
 *
 * Pattern mirrors the patients `PatientStatusChangeDropdown`:
 * - useTransition provides the loading state
 * - On success, toast + router.refresh() so the page re-fetches
 * - On error, toast the action's Spanish error message
 *
 * Two statuses (ACTIVE / INACTIVE). The current status is disabled
 * in the dropdown so the user can't select the same status they're
 * already on. Per design AD4, any transition is valid (no state
 * machine) — toggling back and forth is allowed.
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { changeServiceStatus } from "@/modules/services/actions";
import {
  ServiceStatus,
  type ServiceStatusType,
} from "@/modules/services/domain/service";
import { getServiceStatusLabel } from "@/modules/services/presentation/formatters";

import { Button } from "@/components/ui/button";

interface ServiceStatusChangeDropdownProps {
  serviceId: string;
  currentStatus: ServiceStatusType;
}

const ALL_STATUSES: ServiceStatusType[] = [
  ServiceStatus.ACTIVE,
  ServiceStatus.INACTIVE,
];

export function ServiceStatusChangeDropdown({
  serviceId,
  currentStatus,
}: ServiceStatusChangeDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: ServiceStatusType) {
    if (next === currentStatus) return;
    startTransition(async () => {
      try {
        const result = await changeServiceStatus({
          id: serviceId,
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
    <div className="flex flex-wrap gap-2" data-testid="service-status-change">
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
            {getServiceStatusLabel(status)}
          </Button>
        );
      })}
    </div>
  );
}
