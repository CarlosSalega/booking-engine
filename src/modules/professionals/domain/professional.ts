export const ProfessionalStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type ProfessionalStatusType =
  (typeof ProfessionalStatus)[keyof typeof ProfessionalStatus];
