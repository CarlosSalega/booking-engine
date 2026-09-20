import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = {
  professional: { findFirst: vi.fn() },
  professionalScheduleInterval: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
};
const prismaMock = {
  professionalScheduleInterval: { findMany: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { getProfessionalSchedule, replaceProfessionalSchedule, ScheduleValidationError } =
  await import("../schedule-data");

describe("schedule data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.professional.findFirst.mockResolvedValue({ id: "professional" });
    txMock.professionalScheduleInterval.deleteMany.mockResolvedValue({ count: 1 });
    txMock.professionalScheduleInterval.createMany.mockResolvedValue({ count: 1 });
  });

  it("scopes and orders weekly intervals by organization and professional", async () => {
    prismaMock.professionalScheduleInterval.findMany.mockResolvedValueOnce([
      { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
    ]);

    await getProfessionalSchedule("org", "professional");

    expect(prismaMock.professionalScheduleInterval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org", professionalId: "professional" } }),
    );
  });

  it("replaces the full set atomically", async () => {
    const intervals = [{ dayOfWeek: 1, startMinute: 540, endMinute: 720 }];
    await replaceProfessionalSchedule("org", "professional", intervals);

    expect(txMock.professionalScheduleInterval.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org", professionalId: "professional" },
    });
    expect(txMock.professionalScheduleInterval.createMany).toHaveBeenCalledWith({
      data: [{ organizationId: "org", professionalId: "professional", ...intervals[0] }],
    });
  });

  it("rejects overlapping intervals before opening a transaction", async () => {
    await expect(
      replaceProfessionalSchedule("org", "professional", [
        { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
        { dayOfWeek: 1, startMinute: 700, endMinute: 780 },
      ]),
    ).rejects.toBeInstanceOf(ScheduleValidationError);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
