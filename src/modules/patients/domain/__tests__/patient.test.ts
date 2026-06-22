import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PatientStatus, patientMatches } from "../patient";
import type { Patient, PatientData } from "../patient.schema";
import { patientDataSchema, patientSchema } from "../patient.schema";

import * as PatientsBarrel from "@/modules/patients";

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const VALID_ORG_ID = "22222222-2222-4222-8222-222222222222";
const VALID_USER_ID = "33333333-3333-4333-8333-333333333333";

function makeValidPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: VALID_ID,
    organizationId: VALID_ORG_ID,
    fullName: "María García",
    email: "maria@example.com",
    phone: "+54 11 5555-1234",
    documentId: "30123456",
    status: PatientStatus.ACTIVE,
    notes: "Prefiere turnos mañana",
    createdByUserId: VALID_USER_ID,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("patientSchema — valid cases", () => {
  it("accepts a patient with all fields", () => {
    const result = patientSchema.safeParse(makeValidPatient());
    expect(result.success).toBe(true);
  });

  it("accepts a patient with minimal required fields only", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({
        email: undefined,
        phone: undefined,
        documentId: undefined,
        notes: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts BLOCKED status", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ status: PatientStatus.BLOCKED }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a patient with optional fields explicitly undefined", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({
        fullName: "Juan Pérez",
        email: undefined,
        phone: undefined,
        documentId: undefined,
        notes: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("preserves createdByUserId in the parsed output (audit field round-trip)", () => {
    const result = patientSchema.safeParse(makeValidPatient());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdByUserId).toBe(VALID_USER_ID);
    }
  });
});

describe("patientSchema — rejection cases", () => {
  it("rejects empty fullName (rule 1)", () => {
    const result = patientSchema.safeParse(makeValidPatient({ fullName: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Full name is required",
        ),
      ).toBe(true);
    }
  });

  it("rejects patient without createdByUserId (audit field required)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ createdByUserId: undefined }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Invalid UUID"),
      ).toBe(true);
    }
  });

  it("rejects non-UUID createdByUserId", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ createdByUserId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Invalid UUID"),
      ).toBe(true);
    }
  });

  it("rejects fullName exceeding 100 characters (rule 2)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ fullName: "a".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid email (rule 3)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ email: "not-an-email" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Invalid email format"),
      ).toBe(true);
    }
  });

  it("rejects documentId with letters (rule 4)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ documentId: "AB123456" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.message === "Document ID must be 7-8 digits with no separators",
        ),
      ).toBe(true);
    }
  });

  it("rejects documentId with wrong length (rule 4)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ documentId: "12345" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects documentId with separators (rule 4)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ documentId: "30.123.456" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value (rule 5)", () => {
    // @ts-expect-error - intentionally passing invalid runtime value to test Zod validation
    const invalid = makeValidPatient({ status: "PENDING" });
    const result = patientSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Invalid patient status",
        ),
      ).toBe(true);
    }
  });

  it("rejects notes exceeding 1000 characters (rule 6)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ notes: "a".repeat(1001) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Notes must be 1000 characters or less",
        ),
      ).toBe(true);
    }
  });

  it("rejects invalid UUID for id (rule 7)", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ id: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Invalid UUID"),
      ).toBe(true);
    }
  });
});

describe("patientSchema — boundary values", () => {
  it("accepts fullName of exactly 100 characters", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ fullName: "a".repeat(100) }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts notes of exactly 1000 characters", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ notes: "a".repeat(1000) }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts documentId of exactly 7 digits", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ documentId: "1234567" }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts documentId of exactly 8 digits", () => {
    const result = patientSchema.safeParse(
      makeValidPatient({ documentId: "12345678" }),
    );
    expect(result.success).toBe(true);
  });
});

describe("patientDataSchema — strict mode", () => {
  it("accepts valid creation input without id/timestamps", () => {
    const result = patientDataSchema.safeParse({
      organizationId: VALID_ORG_ID,
      fullName: "Ana Torres",
      status: PatientStatus.ACTIVE,
      email: "ana@example.com",
      documentId: "40123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects creation input with id present (strict mode)", () => {
    const result = patientDataSchema.safeParse({
      id: VALID_ID,
      organizationId: VALID_ORG_ID,
      fullName: "Ana Torres",
      status: PatientStatus.ACTIVE,
    });
    expect(result.success).toBe(false);
  });

  it("rejects creation input with createdByUserId present (set by action, not input)", () => {
    const result = patientDataSchema.safeParse({
      organizationId: VALID_ORG_ID,
      fullName: "Ana Torres",
      status: PatientStatus.ACTIVE,
      createdByUserId: VALID_USER_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.code === "unrecognized_keys",
      );
      expect(issue).toBeDefined();
      expect(issue?.keys).toContain("createdByUserId");
    }
  });
});

describe("patientMatches", () => {
  it("matches by normalized fullName + email (rule 1)", () => {
    const a = makeValidPatient({
      fullName: "María García",
      email: "MARIA@example.com",
    });
    const b = makeValidPatient({
      fullName: "María   García",
      email: "maria@example.com",
    });
    expect(patientMatches(a, b)).toBe(true);
  });

  it("matches by normalized fullName + phone (rule 2)", () => {
    const a = makeValidPatient({
      fullName: "Juan Pérez",
      phone: "+54 11 5555-1234",
      email: undefined,
    });
    const b = makeValidPatient({
      fullName: "juan pérez",
      phone: "+54 11 5555-1234",
      email: undefined,
    });
    expect(patientMatches(a, b)).toBe(true);
  });

  it("matches by documentId even when fullName differs (rule 3)", () => {
    const a = makeValidPatient({
      fullName: "Carlos López",
      documentId: "30123456",
      email: undefined,
      phone: undefined,
    });
    const b = makeValidPatient({
      fullName: "C. López",
      documentId: "30123456",
      email: undefined,
      phone: undefined,
    });
    expect(patientMatches(a, b)).toBe(true);
  });

  it("does not match different patients", () => {
    const a = makeValidPatient({
      fullName: "Ana Torres",
      email: "ana@test.com",
      phone: undefined,
      documentId: undefined,
    });
    const b = makeValidPatient({
      fullName: "Pedro Ruiz",
      email: "pedro@test.com",
      phone: undefined,
      documentId: undefined,
    });
    expect(patientMatches(a, b)).toBe(false);
  });

  it("returns false when email is absent on one side (null safety)", () => {
    const a: PatientData = {
      organizationId: VALID_ORG_ID,
      fullName: "María García",
      status: PatientStatus.ACTIVE,
    };
    const b: PatientData = {
      organizationId: VALID_ORG_ID,
      fullName: "María García",
      email: "maria@test.com",
      status: PatientStatus.ACTIVE,
    };
    expect(patientMatches(a, b)).toBe(false);
  });
});

describe("barrel exports", () => {
  it("re-exports all public symbols from @/modules/patients", () => {
    expect(PatientsBarrel.PatientStatus).toBeDefined();
    expect(typeof PatientsBarrel.PatientStatus).toBe("object");
    expect(PatientsBarrel.patientSchema).toBeDefined();
    expect(PatientsBarrel.patientDataSchema).toBeDefined();
    expect(typeof PatientsBarrel.patientMatches).toBe("function");
    // Data layer (PR #1)
    expect(typeof PatientsBarrel.getPatients).toBe("function");
    expect(typeof PatientsBarrel.getPatientById).toBe("function");
    expect(typeof PatientsBarrel.createPatient).toBe("function");
    expect(typeof PatientsBarrel.updatePatient).toBe("function");
    expect(PatientsBarrel.PatientNotFoundError).toBeDefined();
    expect(PatientsBarrel.DEFAULT_PAGE_SIZE).toBe(20);
    // Type-level: ensure inferred types are exported (compile-time check)
    const _type: PatientsBarrel.Patient = makeValidPatient();
    const _data: PatientsBarrel.PatientData = {
      organizationId: VALID_ORG_ID,
      fullName: "Test",
      status: PatientStatus.ACTIVE,
    };
    const _enriched: PatientsBarrel.EnrichedPatient = {
      ...makeValidPatient(),
      createdByUserName: "Admin Pérez",
    };
    expect(_type).toBeDefined();
    expect(_data).toBeDefined();
    expect(_enriched).toBeDefined();
    // suppress unused warnings
    void _type;
    void _data;
    void _enriched;
  });
});

describe("module isolation", () => {
  const moduleDir = resolve(__dirname, "..");

  it("domain files have no imports from next, react, or @prisma/client", () => {
    const files = ["patient.ts", "patient.schema.ts", "index.ts"];
    const forbidden = [/from\s+["']next\//, /from\s+["']react/, /from\s+["']@prisma\/client/];
    for (const file of files) {
      const content = readFileSync(resolve(moduleDir, file), "utf8");
      for (const pattern of forbidden) {
        expect(pattern.test(content), `${file} should not import ${pattern}`).toBe(false);
      }
    }
  });
});
