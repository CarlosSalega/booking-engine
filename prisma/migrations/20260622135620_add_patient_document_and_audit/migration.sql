-- Add documentId (nullable) and createdByUserId (initially nullable for safe backfill)
ALTER TABLE "Patient" ADD COLUMN "documentId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "createdByUserId" TEXT;

-- Backfill existing patients with the admin user id (audit trail)
-- If no admin exists, fall back to the first user in the org.
UPDATE "Patient" AS p
SET "createdByUserId" = COALESCE(
  (SELECT u.id FROM "user" AS u WHERE u.role = 'ADMIN' ORDER BY u."createdAt" ASC LIMIT 1),
  (SELECT u.id FROM "user" AS u ORDER BY u."createdAt" ASC LIMIT 1)
)
WHERE p."createdByUserId" IS NULL;

-- Now enforce NOT NULL — every Patient must have a creator for audit.
ALTER TABLE "Patient" ALTER COLUMN "createdByUserId" SET NOT NULL;

-- Indexes for the new columns (used by dedup and audit lookups)
CREATE INDEX "Patient_documentId_idx" ON "Patient"("documentId");
CREATE INDEX "Patient_createdByUserId_idx" ON "Patient"("createdByUserId");
