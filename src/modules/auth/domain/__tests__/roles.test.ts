import { describe, expect, it } from "vitest";

import {
  ROLE_PERMISSIONS,
  SESSION_DURATION,
  USER_ROLE,
  type UserRoleType,
} from "../roles";

describe("USER_ROLE", () => {
  it("defines exactly the four expected role values", () => {
    expect(Object.values(USER_ROLE).sort()).toEqual(
      ["ADMIN", "PATIENT", "PROFESSIONAL", "SECRETARY"].sort(),
    );
  });

  it("exposes string values matching the key names", () => {
    expect(USER_ROLE.ADMIN).toBe("ADMIN");
    expect(USER_ROLE.PROFESSIONAL).toBe("PROFESSIONAL");
    expect(USER_ROLE.PATIENT).toBe("PATIENT");
    expect(USER_ROLE.SECRETARY).toBe("SECRETARY");
  });
});

describe("SESSION_DURATION", () => {
  it("uses an 8h session for ADMIN (28_800 seconds)", () => {
    expect(SESSION_DURATION.ADMIN).toBe(28_800);
  });

  it("uses a 24h session for PROFESSIONAL (86_400 seconds)", () => {
    expect(SESSION_DURATION.PROFESSIONAL).toBe(86_400);
  });

  it("uses a 30d session for PATIENT (2_592_000 seconds)", () => {
    expect(SESSION_DURATION.PATIENT).toBe(2_592_000);
  });

  it("uses an 8h session for SECRETARY (28_800 seconds)", () => {
    expect(SESSION_DURATION.SECRETARY).toBe(28_800);
  });

  it("covers every user role without gaps", () => {
    const roles = Object.values(USER_ROLE);
    for (const role of roles) {
      expect(SESSION_DURATION[role as UserRoleType]).toBeTypeOf("number");
    }
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("defines a non-empty permission set for every role", () => {
    const roles = Object.values(USER_ROLE);
    for (const role of roles) {
      const perms = ROLE_PERMISSIONS[role as UserRoleType];
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
    }
  });

  it("grants ADMIN broad management permissions", () => {
    expect(ROLE_PERMISSIONS.ADMIN).toContain("user:manage");
    expect(ROLE_PERMISSIONS.ADMIN).toContain("service:manage");
    expect(ROLE_PERMISSIONS.ADMIN).toContain("booking:manage");
  });

  it("restricts PATIENT to self-scoped actions", () => {
    for (const perm of ROLE_PERMISSIONS.PATIENT) {
      expect(perm.endsWith(":own")).toBe(true);
    }
  });

  it("grants PROFESSIONAL own-scope management but not user:manage", () => {
    expect(ROLE_PERMISSIONS.PROFESSIONAL).toContain("service:manage:own");
    expect(ROLE_PERMISSIONS.PROFESSIONAL).not.toContain("user:manage");
  });
});
