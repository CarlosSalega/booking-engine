/**
 * `PatientStatusFilter` — status filter for the patients list page.
 *
 * Thin wrapper over the generic `StatusFilter` UI component.
 * Configures patient-specific options, base path, and test id.
 */

import {
  PatientStatus,
} from "@/modules/patients/domain/patient";
import { getPatientStatusLabel } from "@/modules/patients/presentation/formatters";

import {
  StatusFilter,
  ALL_VALUE,
  type StatusFilterOption,
} from "@/components/ui/status-filter";

const OPTIONS: StatusFilterOption[] = [
  { value: ALL_VALUE, label: "Todos" },
  { value: PatientStatus.ACTIVE, label: getPatientStatusLabel(PatientStatus.ACTIVE) },
  { value: PatientStatus.INACTIVE, label: getPatientStatusLabel(PatientStatus.INACTIVE) },
  { value: PatientStatus.BLOCKED, label: getPatientStatusLabel(PatientStatus.BLOCKED) },
];

export function PatientStatusFilter() {
  return (
    <StatusFilter
      options={OPTIONS}
      basePath="/dashboard/patients"
      testId="patient-status-filter"
    />
  );
}
