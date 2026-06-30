/**
 * Tests for the cached `getSettings` wrapper.
 *
 * `getSettings(orgId)` is a thin cache-enabled wrapper around
 * `getByOrgId(orgId)`. The wrapper applies the Next.js 16 cache
 * directives so the read is:
 *
 *   1. `cacheTag("settings")`     — invalidated by every `updateTag("settings")` call
 *   2. `cacheLife({ revalidate: 300 })` — fresh for 5 minutes, then SWR
 *   3. `"use cache"` directive     — a build-time hint to the Next bundler
 *
 * Mock strategy:
 *   - `next/cache`   → spies on `cacheTag` and `cacheLife`
 *   - `@/lib/prisma` → stub of `organizationSettings.findUnique`
 *
 * The `"use cache"` directive at the top of `getSettings` is a build-time
 * hint to the Next bundler; in the vitest environment it is just a string
 * expression statement. The real assertions are on the runtime
 * `cacheTag` / `cacheLife` calls and the `getByOrgId` delegation. This
 * mirrors how the existing `settings-data.test.ts` exercises `getByOrgId`
 * — same module, no internal mocking needed.
 *
 * Spec source: `openspec/changes/settings/specs/settings-domain/spec.md`
 *   — Requirement: Cache Layer
 *     Scenario: Cache hit
 *     Scenario: Cache invalidation on write
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the dynamic import of the data provider.
// ---------------------------------------------------------------------------

const cacheTagMock = vi.fn();
const cacheLifeMock = vi.fn();
const updateTagMock = vi.fn();

vi.mock("next/cache", () => ({
  cacheTag: cacheTagMock,
  cacheLife: cacheLifeMock,
  updateTag: updateTagMock,
}));

const prismaMock = {
  organizationSettings: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Import after the mocks are in place. `getSettings` does not exist yet
// in the production file — this is the RED step. The dynamic import will
// fail with "getSettings is not exported" until GREEN.
const { getSettings, getByOrgId } = await import("../settings-data");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const SETTINGS_ID = "00000000-0000-4000-8000-0000000000a1";

function makeDbSettings(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: SETTINGS_ID,
    organizationId: ORG_ID,
    name: "Clínica Demo",
    description: null,
    address: null,
    timezone: "America/Argentina/Buenos_Aires",
    phone: null,
    email: null,
    defaultDurationMinutes: 30,
    minAdvanceBookingHours: 1,
    maxBookingsPerDay: 50,
    bufferMinutes: 0,
    cancellationEnabled: true,
    cancellationLimitHours: 24,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// `getSettings` — the cached read wrapper
// ---------------------------------------------------------------------------

describe("getSettings (cached read wrapper)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the row from getByOrgId (delegation: same data, cached)", async () => {
    const row = makeDbSettings({ name: "Clínica Demo" });
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(row);

    const result = await getSettings(ORG_ID);

    expect(result).toEqual(row);
  });

  it("delegates to getByOrgId with the same organizationId scoping", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(
      makeDbSettings(),
    );

    await getSettings(ORG_ID);

    // `getSettings` MUST forward the orgId unchanged so cache entries
    // remain tenant-scoped.
    expect(prismaMock.organizationSettings.findUnique).toHaveBeenCalledTimes(1);
    expect(
      prismaMock.organizationSettings.findUnique.mock.calls[0]?.[0],
    ).toEqual({ where: { organizationId: ORG_ID } });
  });

  it("tags the cache with 'settings' so updateTag('settings') can invalidate it", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(
      makeDbSettings(),
    );

    await getSettings(ORG_ID);

    expect(cacheTagMock).toHaveBeenCalledWith("settings");
  });

  it("applies a 300s revalidate cacheLife (5 minutes fresh, then SWR)", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(
      makeDbSettings(),
    );

    await getSettings(ORG_ID);

    expect(cacheLifeMock).toHaveBeenCalledWith({ revalidate: 300 });
  });

  it("returns null when no settings exist for the org (greenfield)", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(null);

    const result = await getSettings(ORG_ID);

    expect(result).toBeNull();
  });

  it("does not cross tenants (a different orgId is forwarded to getByOrgId)", async () => {
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(null);

    await getSettings(OTHER_ORG_ID);

    expect(
      prismaMock.organizationSettings.findUnique.mock.calls[0]?.[0],
    ).toEqual({ where: { organizationId: OTHER_ORG_ID } });
  });
});

// ---------------------------------------------------------------------------
// `getByOrgId` — sanity check that the original (non-cached) read still
// works alongside the new `getSettings` wrapper. Same module, no overlap.
// ---------------------------------------------------------------------------

describe("getByOrgId (uncached, untouched by getSettings)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("still returns the row directly without invoking cache directives", async () => {
    const row = makeDbSettings();
    prismaMock.organizationSettings.findUnique.mockResolvedValueOnce(row);

    const result = await getByOrgId(ORG_ID);

    expect(result).toEqual(row);
    // The uncached path MUST NOT tag or set a cacheLife — those are
    // exclusively the responsibility of `getSettings`.
    expect(cacheTagMock).not.toHaveBeenCalled();
    expect(cacheLifeMock).not.toHaveBeenCalled();
  });
});
