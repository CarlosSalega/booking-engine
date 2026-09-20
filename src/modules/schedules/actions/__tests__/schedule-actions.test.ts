import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  session: vi.fn(),
  getOrganizationId: vi.fn(),
  revalidatePath: vi.fn(),
  schedule: vi.fn(),
  professional: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: fixtures.revalidatePath }));
vi.mock("@/core/auth", () => ({ auth: { api: { getSession: fixtures.session } } }));
vi.mock("@/modules/dashboard/data/get-organization-id", () => ({
  getOrganizationId: fixtures.getOrganizationId,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    professional: { findFirst: fixtures.professional },
    $transaction: fixtures.schedule,
  },
}));
vi.mock("../schedule-data", () => ({
  getProfessionalSchedule: fixtures.schedule,
  replaceProfessionalSchedule: fixtures.schedule,
  ScheduleValidationError: class ScheduleValidationError extends Error {},
}));

const { getSchedule } = await import("../get-professional-schedule.action");
const { updateSchedule } = await import("../replace-professional-schedule.action");

describe("schedule actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.getOrganizationId.mockResolvedValue("org");
    fixtures.schedule.mockResolvedValue([]);
  });

  it("rejects patients before reading schedules", async () => {
    fixtures.session.mockResolvedValue({ user: { id: "user", role: "PATIENT" } });

    const result = await getSchedule({ professionalId: "00000000-0000-4000-8000-000000000001" });

    expect(result).toEqual({ success: false, error: "No autorizado" });
    expect(fixtures.schedule).not.toHaveBeenCalled();
  });

  it("restricts professional reads to their own professional", async () => {
    fixtures.session.mockResolvedValue({ user: { id: "user", role: "PROFESSIONAL" } });
    fixtures.professional.mockResolvedValue({ id: "other" });

    const result = await getSchedule({ professionalId: "00000000-0000-4000-8000-000000000001" });

    expect(result).toEqual({ success: false, error: "No autorizado" });
  });

  it("updates a schedule and invalidates schedule-dependent pages", async () => {
    fixtures.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });

    const result = await updateSchedule({
      professionalId: "00000000-0000-4000-8000-000000000001",
      intervals: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720 }],
    });

    expect(result).toEqual({ success: true });
    expect(fixtures.schedule).toHaveBeenCalled();
    expect(fixtures.revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
  });
});
