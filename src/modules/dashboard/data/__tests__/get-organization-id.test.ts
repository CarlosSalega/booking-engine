/**
 * Tests for the getOrganizationId helper.
 *
 * Auth is handled by the dashboard layout — this helper only resolves
 * the organization from the database and caches it.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  professional: {
    findFirst: vi.fn(),
  },
};

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

  it("returns the organizationId from the first professional record on first call", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce({
      organizationId: ORG_ID,
    });

    const result = await getOrganizationId();

    expect(result).toBe(ORG_ID);
    expect(prismaMock.professional.findFirst).toHaveBeenCalledTimes(1);
  });

  it("caches the organizationId and does not re-query the DB on subsequent calls", async () => {
    prismaMock.professional.findFirst.mockResolvedValue({
      organizationId: ORG_ID,
    });

    await getOrganizationId();
    await getOrganizationId();
    await getOrganizationId();

    expect(prismaMock.professional.findFirst).toHaveBeenCalledTimes(1);
  });

  it("throws a clear error when the database has no organization", async () => {
    prismaMock.professional.findFirst.mockResolvedValueOnce(null);

    await expect(getOrganizationId()).rejects.toThrow(
      "No organization found",
    );
  });

  it("can clear the cache for testing", async () => {
    prismaMock.professional.findFirst.mockResolvedValue({
      organizationId: ORG_ID,
    });

    await getOrganizationId(); // caches
    __resetOrganizationIdCache();
    await getOrganizationId(); // should query again

    expect(prismaMock.professional.findFirst).toHaveBeenCalledTimes(2);
  });
});
