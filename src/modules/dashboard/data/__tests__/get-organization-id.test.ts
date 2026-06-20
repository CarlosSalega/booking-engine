/**
 * Tests for the getOrganizationId helper.
 *
 * Strategy: mock both the auth instance and the Prisma client, then
 * verify the helper redirects unauthenticated users, returns the
 * cached value on the second call, and throws a clear error when the
 * database has no organization.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = {
  api: {
    getSession: vi.fn(),
  },
};

const prismaMock = {
  professional: {
    findFirst: vi.fn(),
  },
};

const headersMock = vi.fn(async () => new Headers());
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/core/auth/auth-instance", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const {
  getOrganizationId,
  __resetOrganizationIdCache,
} = await import("../get-organization-id");

const ORG_ID = "00000000-0000-4000-8000-000000000001";

describe("getOrganizationId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetOrganizationIdCache();
  });

  afterEach(() => {
    __resetOrganizationIdCache();
  });

  it("redirects to /login when there is no session", async () => {
    authMock.api.getSession.mockResolvedValueOnce(null);

    await expect(getOrganizationId()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns the organizationId from the first professional record on first call", async () => {
    authMock.api.getSession.mockResolvedValueOnce({
      user: { id: "u1", role: "ADMIN" },
    });
    prismaMock.professional.findFirst.mockResolvedValueOnce({
      organizationId: ORG_ID,
    });

    const result = await getOrganizationId();

    expect(result).toBe(ORG_ID);
    expect(prismaMock.professional.findFirst).toHaveBeenCalledTimes(1);
  });

  it("caches the organizationId and does not re-query the DB on subsequent calls", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    });
    prismaMock.professional.findFirst.mockResolvedValue({
      organizationId: ORG_ID,
    });

    await getOrganizationId();
    await getOrganizationId();
    await getOrganizationId();

    expect(prismaMock.professional.findFirst).toHaveBeenCalledTimes(1);
  });

  it("throws a clear error when the database has no organization", async () => {
    authMock.api.getSession.mockResolvedValueOnce({
      user: { id: "u1", role: "ADMIN" },
    });
    prismaMock.professional.findFirst.mockResolvedValueOnce(null);

    await expect(getOrganizationId()).rejects.toThrow(
      /No organization found/,
    );
  });
});
