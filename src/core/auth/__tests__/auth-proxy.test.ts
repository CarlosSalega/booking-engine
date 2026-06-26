/**
 * Tests for the auth proxy public-path matcher.
 *
 * The public landing change added `"/"` to `PUBLIC_PREFIXES` so an
 * unauthenticated visitor can reach the landing page. This is a
 * defense-in-depth check: the `proxy.ts` matcher excludes `/` first,
 * but the helper still has to agree. The tests guard against:
 *
 * - `"/"` not being treated as public (regression of LND-001).
 * - Prefix leakage: `"/"` must NOT match `"/dashboard"`, `"/admin"`,
 *   `"/api/users"`, or any other non-public path.
 * - The legacy public prefixes (`/login`, `/register`, `/api/auth/*`,
 *   `/_next/*`, `/favicon.ico`) still pass through.
 *
 * Spec scenario: `landing-public` LND-001 (Public Access) and LND-012
 * (Preservation — non-PATIENT redirect and all other routes unchanged).
 */

import { describe, expect, it } from "vitest";

import { isPublicPath, PUBLIC_PREFIXES } from "../auth-proxy";

describe("isPublicPath — public landing", () => {
  it("treats '/' as public (LND-001)", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("does NOT treat '/dashboard' as public (LND-012 prefix-leakage guard)", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
  });

  it("does NOT treat '/dashboard/bookings' as public", () => {
    expect(isPublicPath("/dashboard/bookings")).toBe(false);
  });

  it("does NOT treat '/admin' or any non-public path as public", () => {
    expect(isPublicPath("/admin")).toBe(false);
    expect(isPublicPath("/api/users")).toBe(false);
    expect(isPublicPath("/api/users/123")).toBe(false);
  });
});

describe("isPublicPath — legacy public prefixes still work", () => {
  it("treats '/login' and '/register' as public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
  });

  it("treats '/api/auth' and its subpaths as public", () => {
    expect(isPublicPath("/api/auth")).toBe(true);
    expect(isPublicPath("/api/auth/session")).toBe(true);
    expect(isPublicPath("/api/auth/sign-in")).toBe(true);
  });

  it("treats '/_next' internals as public", () => {
    expect(isPublicPath("/_next/static/chunks/main.js")).toBe(true);
  });

  it("treats '/favicon.ico' as public", () => {
    expect(isPublicPath("/favicon.ico")).toBe(true);
  });
});

describe("PUBLIC_PREFIXES — constant shape", () => {
  it("includes '/' so the constant can be re-read by tests/introspection", () => {
    expect(PUBLIC_PREFIXES).toContain("/");
  });
});
