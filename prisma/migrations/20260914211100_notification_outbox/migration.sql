-- DropForeignKey
ALTER TABLE "Gift" DROP CONSTRAINT "gift_box_fk";

-- DropIndex
DROP INDEX "Account_userId_idx";

-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX "Inquiry_createdAt_idx";

-- DropIndex
DROP INDEX "OrderHistory_orderId_idx";

-- DropIndex
DROP INDEX "OrderItem_orderId_idx";

-- DropIndex
DROP INDEX "Payment_orderId_idx";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_reference_key" ON "Notification"("reference");

-- CreateIndex
CREATE INDEX "Notification_sentAt_nextAttemptAt_idx" ON "Notification"("sentAt", "nextAttemptAt");
