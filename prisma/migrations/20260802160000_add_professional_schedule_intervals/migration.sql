-- CreateTable
CREATE TABLE "ProfessionalScheduleInterval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalScheduleInterval_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProfessionalScheduleInterval_dayOfWeek_check" CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6),
    CONSTRAINT "ProfessionalScheduleInterval_startMinute_check" CHECK ("startMinute" >= 0 AND "startMinute" < 1440),
    CONSTRAINT "ProfessionalScheduleInterval_endMinute_check" CHECK ("endMinute" > 0 AND "endMinute" <= 1440),
    CONSTRAINT "ProfessionalScheduleInterval_order_check" CHECK ("startMinute" < "endMinute")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalScheduleInterval_professionalId_dayOfWeek_startMinute_endMinute_key"
ON "ProfessionalScheduleInterval"("professionalId", "dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "ProfessionalScheduleInterval_organizationId_idx"
ON "ProfessionalScheduleInterval"("organizationId");

-- CreateIndex
CREATE INDEX "ProfessionalScheduleInterval_professionalId_dayOfWeek_startMinute_idx"
ON "ProfessionalScheduleInterval"("professionalId", "dayOfWeek", "startMinute");

-- AddForeignKey
ALTER TABLE "ProfessionalScheduleInterval"
ADD CONSTRAINT "ProfessionalScheduleInterval_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
