import "@testing-library/jest-dom/vitest";

// Provide a placeholder DATABASE_URL so that `import { prisma } from "@/lib/prisma"`
// does not throw at module load time. Tests that exercise Prisma must mock
// `@/lib/prisma` — the URL value itself is irrelevant in test runs.
if (!process.env["DATABASE_URL"]) {
  process.env["DATABASE_URL"] =
    "postgres://test:test@localhost:5432/test?sslmode=disable";
}
