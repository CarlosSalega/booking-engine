/**
 * `ProfessionalStatusFilter` — status filter for the professionals
 * list page.
 *
 * Thin wrapper over the generic `StatusFilter` UI component.
 * Configures professional-specific options, base path, and test id.
 */

import {
  ProfessionalStatus,
} from "@/modules/professionals/domain/professional";
import { getProfessionalStatusLabel } from "@/modules/professionals/presentation/formatters";

import {
  StatusFilter,
  ALL_VALUE,
  type StatusFilterOption,
} from "@/components/ui/status-filter";

const OPTIONS: StatusFilterOption[] = [
  { value: ALL_VALUE, label: "Todos" },
  { value: ProfessionalStatus.ACTIVE, label: getProfessionalStatusLabel(ProfessionalStatus.ACTIVE) },
  { value: ProfessionalStatus.INACTIVE, label: getProfessionalStatusLabel(ProfessionalStatus.INACTIVE) },
];

export function ProfessionalStatusFilter() {
  return (
    <StatusFilter
      options={OPTIONS}
      basePath="/dashboard/professionals"
      testId="professional-status-filter"
    />
  );
}
