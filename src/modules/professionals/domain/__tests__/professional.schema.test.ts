import { describe, it, expect } from "vitest";

import { ProfessionalStatus } from "../professional";
import type { Professional } from "../professional.schema";
import { professionalSchema } from "../professional.schema";

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const VALID_ORG_ID = "22222222-2222-4222-8222-222222222222";

function makeValidProfessional(
  overrides: Partial<Professional> = {},
): Professional {
  return {
    id: VALID_ID,
    organizationId: VALID_ORG_ID,
    fullName: "Dr. García",
    specialty: "Dermatología",
    bio: "15 years of experience",
    avatarUrl: "https://example.com/avatar.jpg",
    status: ProfessionalStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("professionalSchema — valid cases", () => {
  it("accepts an active professional with all fields", () => {
    const result = professionalSchema.safeParse(makeValidProfessional());
    expect(result.success).toBe(true);
  });

  it("accepts a professional with minimal required fields only", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({
        specialty: undefined,
        bio: undefined,
        avatarUrl: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts an inactive professional", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ status: ProfessionalStatus.INACTIVE }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a professional without optional fields (explicit undefined)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({
        fullName: "Dr. López",
        specialty: undefined,
        bio: undefined,
        avatarUrl: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("professionalSchema — rejection cases", () => {
  it("rejects empty fullName (rule 1)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ fullName: "" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Full name must be 1-100 characters",
        ),
      ).toBe(true);
    }
  });

  it("rejects fullName exceeding 100 characters (rule 2)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ fullName: "a".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects specialty exceeding 100 characters (rule 3)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ specialty: "a".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects bio exceeding 1000 characters (rule 4)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ bio: "a".repeat(1001) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid avatarUrl (rule 5)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ avatarUrl: "not-a-valid-url" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Avatar must be a valid URL"),
      ).toBe(true);
    }
  });

  it("rejects invalid UUID for id (rule 6)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ id: "not-a-uuid-format" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value (rule 7)", () => {
    // @ts-expect-error - intentionally passing invalid runtime value to test Zod validation
    const invalid = makeValidProfessional({ status: "PENDING" });
    const result = professionalSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
