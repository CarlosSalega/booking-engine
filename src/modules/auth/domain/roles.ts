/**
 * Auth domain — user roles, permission map, and session duration config.
 *
 * Pure TypeScript. No React, Next.js, Prisma, or Better Auth imports. The
 * auth instance and server actions consume these values but never the other
 * way around, so the domain stays framework-agnostic and unit-testable.
 */

/** Enumerates the four roles the booking engine supports. */
export const USER_ROLE = {
  ADMIN: "ADMIN",
  PROFESSIONAL: "PROFESSIONAL",
  PATIENT: "PATIENT",
  SECRETARY: "SECRETARY",
} as const;

export type UserRoleType = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * Coarse-grained permission keys. The full RBAC matrix will be enforced in
 * later changes (e.g. permissions on individual routes); the map here gives us
 * a single place to look up which role owns which capability name.
 */
export const ROLE_PERMISSIONS = {
  ADMIN: [
    "user:manage",
    "service:manage",
    "booking:manage",
    "payment:manage",
    "report:view",
    "settings:manage",
    "settings:view",
    "analytics:view",
  ],
  PROFESSIONAL: [
    "service:manage:own",
    "booking:manage:own",
    "schedule:manage:own",
    "patient:view:booked",
    "analytics:view",
  ],
  PATIENT: ["booking:create:own", "profile:manage:own"],
  SECRETARY: [
    "booking:manage:any",
    "patient:view",
    "schedule:view",
    "payment:collect",
    "settings:view",
    "analytics:view",
  ],
} as const satisfies Record<UserRoleType, readonly string[]>;

export type PermissionKey = (typeof ROLE_PERMISSIONS)[UserRoleType][number];

/**
 * Session lifetime per role, expressed in seconds.
 *
 * - ADMIN / SECRETARY → 8h (one working day)
 * - PROFESSIONAL      → 24h
 * - PATIENT           → 30d (long-lived, mobile-first)
 */
export const SESSION_DURATION = {
  ADMIN: 28_800,
  PROFESSIONAL: 86_400,
  PATIENT: 2_592_000,
  SECRETARY: 28_800,
} as const satisfies Record<UserRoleType, number>;

export type SessionDurationType = (typeof SESSION_DURATION)[UserRoleType];
