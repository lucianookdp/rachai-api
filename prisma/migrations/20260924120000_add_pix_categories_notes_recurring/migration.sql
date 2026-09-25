-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "recurringId" TEXT,
ADD COLUMN     "recurringPeriod" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "pixKey" TEXT;

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidById" TEXT NOT NULL,
    "participantIds" TEXT[],
    "category" TEXT NOT NULL DEFAULT 'other',
    "dayOfMonth" INTEGER NOT NULL,
    "lastPeriod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringExpense_groupId_idx" ON "RecurringExpense"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_recurringId_recurringPeriod_key" ON "Expense"("recurringId", "recurringPeriod");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

