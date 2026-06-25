/**
 * `ServiceStatusFilter` — status filter for the services list page.
 *
 * Thin wrapper over the generic `StatusFilter` UI component.
 * Configures service-specific options, base path, and test id.
 */

import {
  ServiceStatus,
} from "@/modules/services/domain/service";
import { getServiceStatusLabel } from "@/modules/services/presentation/formatters";

import {
  StatusFilter,
  ALL_VALUE,
  type StatusFilterOption,
} from "@/components/ui/status-filter";

const OPTIONS: StatusFilterOption[] = [
  { value: ALL_VALUE, label: "Todos" },
  { value: ServiceStatus.ACTIVE, label: getServiceStatusLabel(ServiceStatus.ACTIVE) },
  { value: ServiceStatus.INACTIVE, label: getServiceStatusLabel(ServiceStatus.INACTIVE) },
];

export function ServiceStatusFilter() {
  return (
    <StatusFilter
      options={OPTIONS}
      basePath="/dashboard/services"
      testId="service-status-filter"
    />
  );
}
