import { describe, expect, it } from "vitest";

import {
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../../schemas/auth.schema";
import {
  type LoginInput as LoginInputFromSchemasBarrel,
  type RegisterInput as RegisterInputFromSchemasBarrel,
  type ResetPasswordInput as ResetPasswordInputFromSchemasBarrel,
  loginSchema as loginSchemaFromSchemasBarrel,
  registerSchema as registerSchemaFromSchemasBarrel,
  resetPasswordSchema as resetPasswordSchemaFromSchemasBarrel,
} from "@/modules/auth/schemas";

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------

describe("registerSchema — valid cases", () => {
  it("parses a valid registration with name, email and password", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ana");
      expect(result.data.email).toBe("ana@test.com");
      expect(result.data.password).toBe("secure123");
    }
  });

  it("accepts a name with exactly 1 character (lower boundary)", () => {
    const result = registerSchema.safeParse({
      name: "A",
      email: "a@b.co",
      password: "secure123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a name with exactly 100 characters (upper boundary)", () => {
    const result = registerSchema.safeParse({
      name: "a".repeat(100),
      email: "long@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a password with exactly 8 characters (lower boundary)", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@test.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a password much longer than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@test.com",
      password: "a".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("preserves the email as-typed — no implicit case normalization", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "Ana@Example.COM",
      password: "secure123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("Ana@Example.COM");
    }
  });
});

describe("registerSchema — rejection cases", () => {
  it("rejects an empty name with the Spanish 'El nombre es obligatorio' message", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "ana@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "El nombre es obligatorio",
        ),
      ).toBe(true);
    }
  });

  it("rejects a name longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      name: "a".repeat(101),
      email: "ana@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.message === "El nombre debe tener entre 1 y 100 caracteres",
        ),
      ).toBe(true);
    }
  });

  it("rejects an invalid email with the Spanish 'Email inválido' message", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "notanemail",
      password: "secure123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Email inválido"),
      ).toBe(true);
    }
  });

  it("rejects an email missing the local part", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an email missing the domain", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters (7 chars) with the Spanish min message", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@test.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.message === "La contraseña debe tener al menos 8 caracteres",
        ),
      ).toBe(true);
    }
  });

  it("rejects an empty password", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string name", () => {
    const result = registerSchema.safeParse({
      name: 123,
      email: "ana@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when the name field is missing", () => {
    const result = registerSchema.safeParse({
      email: "ana@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("reports multiple errors in a single safeParse call", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "notanemail",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("registerSchema — inferred type", () => {
  it("infers RegisterInput with only name, email, password (no role field — assigned by action)", () => {
    const input: RegisterInput = {
      name: "Ana",
      email: "ana@test.com",
      password: "secure123",
    };
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      // Type-level: parsed data carries the same three fields
      expect(result.data.name).toBe("Ana");
      expect(result.data.email).toBe("ana@test.com");
      expect(result.data.password).toBe("secure123");
    }
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------

describe("loginSchema — valid cases", () => {
  it("parses a valid login with email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
      password: "secure123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a non-empty password of any length (Better Auth verifies it server-side)", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
      password: "1",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema — rejection cases", () => {
  it("rejects an empty password with the Spanish 'La contraseña es obligatoria' message", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "La contraseña es obligatoria",
        ),
      ).toBe(true);
    }
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "notanemail",
      password: "secure123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Email inválido"),
      ).toBe(true);
    }
  });

  it("rejects when the email field is missing", () => {
    const result = loginSchema.safeParse({
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when the password field is missing", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema — inferred type", () => {
  it("infers LoginInput with email and password as required strings", () => {
    const input: LoginInput = {
      email: "user@test.com",
      password: "secure123",
    };
    expect(input.email).toBeTypeOf("string");
    expect(input.password).toBeTypeOf("string");
  });
});

// ---------------------------------------------------------------------------
// resetPasswordSchema
// ---------------------------------------------------------------------------

describe("resetPasswordSchema — valid cases", () => {
  it("parses a valid email-only payload", () => {
    const result = resetPasswordSchema.safeParse({
      email: "user@test.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("resetPasswordSchema — rejection cases", () => {
  it("rejects an invalid email", () => {
    const result = resetPasswordSchema.safeParse({ email: "notanemail" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Email inválido"),
      ).toBe(true);
    }
  });

  it("rejects an empty email", () => {
    const result = resetPasswordSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when the email field is missing", () => {
    const result = resetPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema — inferred type", () => {
  it("infers ResetPasswordInput with only the email field", () => {
    const input: ResetPasswordInput = { email: "user@test.com" };
    expect(input.email).toBe("user@test.com");
  });
});

// ---------------------------------------------------------------------------
// Barrel re-exports
// ---------------------------------------------------------------------------

describe("barrel completeness", () => {
  it("re-exports all three schemas from @/modules/auth/schemas", () => {
    expect(registerSchemaFromSchemasBarrel).toBe(registerSchema);
    expect(loginSchemaFromSchemasBarrel).toBe(loginSchema);
    expect(resetPasswordSchemaFromSchemasBarrel).toBe(resetPasswordSchema);
  });

  it("re-exports the inferred types from @/modules/auth/schemas", () => {
    // Type-level: the assignments must compile
    const _register: RegisterInputFromSchemasBarrel = {
      name: "Ana",
      email: "ana@test.com",
      password: "secure123",
    };
    const _login: LoginInputFromSchemasBarrel = {
      email: "user@test.com",
      password: "secure123",
    };
    const _reset: ResetPasswordInputFromSchemasBarrel = {
      email: "user@test.com",
    };
    expect(_register.name).toBe("Ana");
    expect(_login.email).toBe("user@test.com");
    expect(_reset.email).toBe("user@test.com");
  });
});
