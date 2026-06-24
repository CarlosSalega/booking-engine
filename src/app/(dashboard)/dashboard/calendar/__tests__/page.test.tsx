/**
 * Tests for the `/dashboard/calendar` Server Component page.
 *
 * The page is the entry point for the calendar feature. It:
 *
 * 1. Resolves the session via `auth.api.getSession`. An unauthenticated
 *    request triggers `redirect("/login")`.
 * 2. Resolves the org via `getOrganizationId()`.
 * 3. Reads `searchParams` for `date`, `view`, and `professionalId`.
 * 4. Applies RBAC scoping:
 *      - PROFESSIONAL → `professionalUserId: session.user.id`
 *      - ADMIN / SECRETARY → `professionalId` from URL (optional)
 * 5. Fetches bookings via `getBookings(orgId, { dateRange, professionalUserId? })`
 * 6. Serializes `startTime` / `endTime` → ISO strings (RSC boundary).
 * 7. Renders `<BookingCalendarToolbar>`, `<BookingCalendar>`,
 *    `<BookingCalendarEmpty>`. The booking-calendar wrapper receives
 *    a `defaultView` that defaults to "day" on mobile (≤768px).
 *
 * Mock strategy: we mock auth (`getSession`), `getOrganizationId`,
 * the data layer (`getBookings`), and the three calendar components
 * (so the test doesn't pull in the Schedule-X runtime, which only
 * works in a real browser).
 */

import "temporal-polyfill/global";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const useMediaQueryMock = vi.fn().mockReturnValue(false);
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: useMediaQueryMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const getSessionMock = vi.fn();
vi.mock("@/core/auth/auth-instance", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

const getOrganizationIdMock = vi.fn();
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: getOrganizationIdMock,
}));

const getBookingsMock = vi.fn();
const getServicesMock = vi.fn();
const getProfessionalsForServiceMock = vi.fn();
vi.mock("@/modules/bookings/data/booking-data", () => ({
  getBookings: getBookingsMock,
  getServices: getServicesMock,
  getProfessionalsForService: getProfessionalsForServiceMock,
}));

// Mock the calendar sub-components so we don't pull in Schedule-X
// (which depends on `window`, the Temporal polyfill, and a real
// DOM layout) — the page test asserts on the props the page hands
// to the wrapper, not the wrapper's internal rendering.
vi.mock("@/components/calendar/booking-calendar", () => ({
  BookingCalendar: (props: Record<string, unknown>) => (
    <div
      data-testid="mock-booking-calendar"
      data-default-view={String(props["defaultView"] ?? "")}
      data-bookings={JSON.stringify(props["bookings"] ?? [])}
    />
  ),
}));

vi.mock("@/components/calendar/booking-calendar-toolbar", () => ({
  BookingCalendarToolbar: (props: Record<string, unknown>) => (
    <div
      data-testid="mock-booking-calendar-toolbar"
      data-view={String(props["view"] ?? "")}
      data-date={String(props["date"] ?? "")}
      data-professional-id={String(props["professionalId"] ?? "")}
    />
  ),
}));

vi.mock("@/components/calendar/booking-calendar-empty", () => ({
  BookingCalendarEmpty: (props: Record<string, unknown>) => (
    <div
      data-testid="mock-booking-calendar-empty"
      data-view={String(props["view"] ?? "")}
    />
  ),
}));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { default: CalendarPage } = await import("../page");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const PROFESSIONAL_USER_ID = "00000000-0000-4000-8000-000000000010";
const PROFESSIONAL_ID = "00000000-0000-4000-8000-000000000011";

const sampleBooking = {
  id: "b1",
  organizationId: ORG_ID,
  patientId: null,
  professionalId: PROFESSIONAL_ID,
  serviceId: "00000000-0000-4000-8000-000000000012",
  startTime: new Date("2026-06-22T13:00:00Z"),
  endTime: new Date("2026-06-22T13:30:00Z"),
  status: "CONFIRMED",
  paymentStatus: "PENDING",
  notes: null,
  createdAt: new Date("2026-06-21T10:00:00Z"),
  updatedAt: new Date("2026-06-21T10:00:00Z"),
  patient: null,
  professional: {
    id: PROFESSIONAL_ID,
    userId: PROFESSIONAL_USER_ID,
    user: { name: "Dr. García" },
  },
  service: {
    id: "00000000-0000-4000-8000-000000000012",
    name: "Limpieza Dental",
    durationMinutes: 30,
    price: 3500,
    paymentType: "FULL",
  },
  payments: [],
};

function sessionFor(
  role: "ADMIN" | "SECRETARY" | "PROFESSIONAL",
  userId: string = USER_ID,
) {
  return { user: { id: userId, role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getOrganizationIdMock.mockReset();
  getOrganizationIdMock.mockResolvedValue(ORG_ID);
  getBookingsMock.mockReset();
  getBookingsMock.mockResolvedValue({
    bookings: [sampleBooking],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  getServicesMock.mockReset();
  getServicesMock.mockResolvedValue([
    {
      id: "s1",
      name: "Limpieza",
      price: 3500,
      durationMinutes: 30,
      paymentType: "FULL",
    },
  ]);
  getProfessionalsForServiceMock.mockReset();
  getProfessionalsForServiceMock.mockResolvedValue([
    {
      id: PROFESSIONAL_ID,
      userId: PROFESSIONAL_USER_ID,
      user: { name: "Dr. García" },
      specialties: ["Odontología"],
    },
  ]);
  useMediaQueryMock.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface RenderArgs {
  searchParams?: Record<string, string | string[] | undefined>;
}

async function renderPage({ searchParams = {} }: RenderArgs = {}) {
  // The page is wrapped in <Suspense> for the data wrapper. The
  // test framework runs the async Server Component to completion
  // BEFORE the render is called, so by the time we hit `findBy*`
  // the data is already loaded. The await on the page call is
  // critical: without it, `render` would be called on a Promise.
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      // @ts-expect-error — the page accepts the App Router's
      // `Promise<searchParams>` shape; we pass the resolved value
      // because the test mocks the awaited searchParams directly.
      await CalendarPage({ searchParams }),
    );
  });
  return result as ReturnType<typeof render>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/dashboard/calendar — auth gate", () => {
  it("redirects to /login when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    await expect(renderPage()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});

describe("/dashboard/calendar — RBAC scoping", () => {
  it("ADMIN: getBookings is called WITHOUT professionalUserId or professionalId", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage();

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as {
      professionalUserId?: string;
      professionalId?: string;
    };
    expect(filters.professionalUserId).toBeUndefined();
    expect(filters.professionalId).toBeUndefined();
  });

  it("PROFESSIONAL: getBookings is called WITH professionalUserId = session.user.id", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    await renderPage();

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalUserId?: string };
    expect(filters.professionalUserId).toBe(PROFESSIONAL_USER_ID);
  });

  it("SECRETARY: forwards URL professionalId to getBookings", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("SECRETARY"));

    await renderPage({
      searchParams: { professionalId: PROFESSIONAL_ID },
    });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as { professionalId?: string };
    expect(filters.professionalId).toBe(PROFESSIONAL_ID);
  });

  it("PROFESSIONAL: URL professionalId is IGNORED (forced to session user id)", async () => {
    getSessionMock.mockResolvedValueOnce(
      sessionFor("PROFESSIONAL", PROFESSIONAL_USER_ID),
    );

    await renderPage({
      searchParams: { professionalId: "00000000-0000-4000-8000-000000000099" },
    });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as {
      professionalUserId?: string;
      professionalId?: string;
    };
    expect(filters.professionalUserId).toBe(PROFESSIONAL_USER_ID);
    expect(filters.professionalId).toBeUndefined();
  });
});

describe("/dashboard/calendar — searchParams parsing", () => {
  it("forwards the view searchParam to the toolbar", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage({ searchParams: { view: "day" } });

    expect(
      screen.getByTestId("mock-booking-calendar-toolbar").getAttribute("data-view"),
    ).toBe("day");
  });

  it("forwards the date searchParam to the toolbar", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage({ searchParams: { date: "2026-06-22" } });

    expect(
      screen
        .getByTestId("mock-booking-calendar-toolbar")
        .getAttribute("data-date"),
    ).toBe("2026-06-22");
  });

  it("forwards the professionalId searchParam to the toolbar (admin/secretary)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage({ searchParams: { professionalId: PROFESSIONAL_ID } });

    expect(
      screen
        .getByTestId("mock-booking-calendar-toolbar")
        .getAttribute("data-professional-id"),
    ).toBe(PROFESSIONAL_ID);
  });

  it("defaults to 'week' view when no searchParam is provided", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage();

    expect(
      screen.getByTestId("mock-booking-calendar-toolbar").getAttribute("data-view"),
    ).toBe("week");
  });
});

describe("/dashboard/calendar — date range", () => {
  it("computes a dateRange from the URL date (week view: Mon–next Mon)", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    // 2026-06-22 is a Monday.
    await renderPage({ searchParams: { date: "2026-06-22", view: "week" } });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as {
      dateRange?: { start: Date; end: Date };
    };
    expect(filters.dateRange).toBeDefined();
    expect(filters.dateRange?.start.toISOString()).toBe(
      "2026-06-22T03:00:00.000Z",
    );
    // Week ends exclusive on the next Monday.
    expect(filters.dateRange?.end.toISOString()).toBe(
      "2026-06-29T03:00:00.000Z",
    );
  });

  it("computes a single-day range for the day view", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage({ searchParams: { date: "2026-06-22", view: "day" } });

    const call = getBookingsMock.mock.calls[0];
    const filters = call?.[1] as {
      dateRange?: { start: Date; end: Date };
    };
    expect(filters.dateRange?.start.toISOString()).toBe(
      "2026-06-22T03:00:00.000Z",
    );
    expect(filters.dateRange?.end.toISOString()).toBe(
      "2026-06-23T03:00:00.000Z",
    );
  });
});

describe("/dashboard/calendar — empty state", () => {
  it("renders the empty state when there are no bookings", async () => {
    // Reset the persistent mock to empty for this test only.
    getBookingsMock.mockReset();
    getBookingsMock.mockResolvedValue({
      bookings: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage();

    expect(
      screen.getByTestId("mock-booking-calendar-empty"),
    ).toBeInTheDocument();
  });
});

describe("/dashboard/calendar — mobile default view", () => {
  it("passes the URL view through to the calendar wrapper (no server-side mobile override)", async () => {
    // The page is a Server Component, so it can't read the
    // viewport. The wrapper (Client Component) handles the
    // ≤ 768px fallback to "day" — that behavior is covered by
    // the wrapper's own tests. The page only passes the URL
    // view (defaulting to "week") to the wrapper.
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage();

    expect(
      screen
        .getByTestId("mock-booking-calendar")
        .getAttribute("data-default-view"),
    ).toBe("week");
  });

  it("maps the URL 'month' view to the Schedule-X 'month-grid' name", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage({ searchParams: { view: "month" } });

    expect(
      screen
        .getByTestId("mock-booking-calendar")
        .getAttribute("data-default-view"),
    ).toBe("month-grid");
  });
});

describe("/dashboard/calendar — date serialization", () => {
  it("passes the bookings to the wrapper with startTime/endTime as ISO strings", async () => {
    getSessionMock.mockResolvedValueOnce(sessionFor("ADMIN"));

    await renderPage();

    const wrapper = screen.getByTestId("mock-booking-calendar");
    const serialized = wrapper.getAttribute("data-bookings") ?? "[]";
    const parsed = JSON.parse(serialized) as Array<{
      startTime: unknown;
      endTime: unknown;
    }>;
    expect(parsed).toHaveLength(1);
    expect(typeof parsed[0]?.startTime).toBe("string");
    expect(typeof parsed[0]?.endTime).toBe("string");
    expect(parsed[0]?.startTime).toBe("2026-06-22T13:00:00.000Z");
    expect(parsed[0]?.endTime).toBe("2026-06-22T13:30:00.000Z");
  });
});
