/**
 * Tests for the professionals domain schema (Zod 4).
 *
 * Coverage mirrors the `professionals-domain` delta spec:
 * - `Professional` entity (MODIFIED): id, organizationId, userId, fullName,
 *   email, image, specialties, license, bio, status, createdAt, updatedAt.
 * - `ProfessionalData` (ADDED): omits id, organizationId, userId, image,
 *   createdAt, updatedAt. Built with `.strict()` so unknown fields fail.
 *
 * The data layer is not exercised here — these tests target the schema
 * (pure Zod) so the contract is pinned before any persistence work.
 */

import { describe, it, expect } from "vitest";

import { z } from "zod";

import { ProfessionalStatus } from "../professional";
import type { Professional, ProfessionalData } from "../professional.schema";
import {
  professionalSchema,
  professionalDataSchema,
} from "../professional.schema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const VALID_ORG_ID = "22222222-2222-4222-8222-222222222222";
const VALID_USER_ID = "33333333-3333-4333-8333-333333333333";

function makeValidProfessional(
  overrides: Partial<Professional> = {},
): Professional {
  return {
    id: VALID_ID,
    organizationId: VALID_ORG_ID,
    userId: VALID_USER_ID,
    fullName: "Dr. García",
    email: "garcia@test.com",
    image: "https://example.com/avatar.jpg",
    specialties: ["Dermatología", "Cirugía"],
    license: "MN-12345",
    bio: "15 years of experience",
    status: ProfessionalStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeValidProfessionalData(
  overrides: Partial<ProfessionalData> = {},
): ProfessionalData {
  return {
    fullName: "Dr. García",
    email: "garcia@test.com",
    specialties: ["Dermatología"],
    license: "MN-12345",
    bio: "15 years of experience",
    status: ProfessionalStatus.ACTIVE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// `professionalSchema` — valid cases
// ---------------------------------------------------------------------------

describe("professionalSchema — valid cases", () => {
  it("accepts an active professional with all fields", () => {
    const result = professionalSchema.safeParse(makeValidProfessional());
    expect(result.success).toBe(true);
  });

  it("accepts a professional with minimal required fields only (no license, bio, image)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({
        license: undefined,
        bio: undefined,
        image: undefined,
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

  it("accepts a professional with a single specialty", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ specialties: ["Dermatología"] }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a professional with 10 specialties (boundary max)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({
        specialties: Array.from({ length: 10 }, (_, i) => `Spec ${i + 1}`),
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a professional without image (User.image is optional)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ image: undefined }),
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// `professionalSchema` — rejection cases
// ---------------------------------------------------------------------------

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

  it("rejects invalid email (rule 3)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ email: "not-an-email" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Invalid email format"),
      ).toBe(true);
    }
  });

  it("rejects empty specialties array (rule 4)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ specialties: [] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "At least one specialty is required",
        ),
      ).toBe(true);
    }
  });

  it("rejects specialties exceeding 10 items (rule 5)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({
        specialties: Array.from({ length: 11 }, (_, i) => `Spec ${i + 1}`),
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects specialty item exceeding 100 characters (rule 6)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ specialties: ["a".repeat(101)] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects license exceeding 50 characters (rule 7)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ license: "a".repeat(51) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects bio exceeding 1000 characters (rule 8)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ bio: "a".repeat(1001) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Bio max 1000 characters",
        ),
      ).toBe(true);
    }
  });

  it("rejects invalid image URL (rule 9)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ image: "not-a-valid-url" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Image must be a valid URL",
        ),
      ).toBe(true);
    }
  });

  it("rejects invalid UUID for id (rule 10)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ id: "not-a-uuid-format" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for userId (rule 10)", () => {
    const result = professionalSchema.safeParse(
      makeValidProfessional({ userId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value (rule 11)", () => {
    // @ts-expect-error - intentionally passing invalid runtime value to test Zod validation
    const invalid = makeValidProfessional({ status: "PENDING" });
    const result = professionalSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// `professionalDataSchema` — strict creation input
// ---------------------------------------------------------------------------

describe("professionalDataSchema — creation input", () => {
  it("accepts a valid creation input with all required fields", () => {
    const result = professionalDataSchema.safeParse(
      makeValidProfessionalData(),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid creation input with only required fields", () => {
    const result = professionalDataSchema.safeParse({
      fullName: "Dr. García",
      email: "garcia@test.com",
      specialties: ["Dermatología"],
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects `id` (id is server-generated, strict mode rejects unknown)", () => {
    const result = professionalDataSchema.safeParse({
      ...makeValidProfessionalData(),
      id: VALID_ID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects `userId` (userId is generated via $transaction, strict mode rejects)", () => {
    const result = professionalDataSchema.safeParse({
      ...makeValidProfessionalData(),
      userId: VALID_USER_ID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects `organizationId` (server-injected from session, strict mode rejects)", () => {
    const result = professionalDataSchema.safeParse({
      ...makeValidProfessionalData(),
      organizationId: VALID_ORG_ID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects `createdAt` / `updatedAt` (timestamps are DB-managed)", () => {
    const result = professionalDataSchema.safeParse({
      ...makeValidProfessionalData(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("inferred type matches the domain contract", () => {
    // Compile-time check: ProfessionalData must not include id / userId / image.
    type _HasNoId = "id" extends keyof ProfessionalData ? false : true;
    type _HasNoUserId = "userId" extends keyof ProfessionalData ? false : true;
    type _HasNoImage = "image" extends keyof ProfessionalData ? false : true;
    type _HasNoOrgId =
      "organizationId" extends keyof ProfessionalData ? false : true;
    const assertNoId: _HasNoId = true;
    const assertNoUserId: _HasNoUserId = true;
    const assertNoImage: _HasNoImage = true;
    const assertNoOrgId: _HasNoOrgId = true;
    expect([assertNoId, assertNoUserId, assertNoImage, assertNoOrgId]).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Schema export surface
// ---------------------------------------------------------------------------

describe("schema exports", () => {
  it("professionalSchema and professionalDataSchema are Zod object schemas", () => {
    expect(professionalSchema).toBeInstanceOf(z.ZodObject);
    expect(professionalDataSchema).toBeInstanceOf(z.ZodObject);
  });
});
