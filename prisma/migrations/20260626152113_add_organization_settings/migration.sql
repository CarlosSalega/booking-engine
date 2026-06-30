-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "phone" TEXT,
    "email" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "minAdvanceBookingHours" INTEGER NOT NULL DEFAULT 1,
    "maxBookingsPerDay" INTEGER NOT NULL DEFAULT 50,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "cancellationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cancellationLimitHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSettings_organizationId_idx" ON "OrganizationSettings"("organizationId");
