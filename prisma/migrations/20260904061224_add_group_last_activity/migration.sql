-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Group_lastActivityAt_idx" ON "Group"("lastActivityAt");
