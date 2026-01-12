-- AlterTable: Add receiptId column to Payment
ALTER TABLE "Payment" ADD COLUMN "receiptId" TEXT;

-- Migrate existing data: Copy receipt relationships from Receipt.paymentId to Payment.receiptId
UPDATE "Payment" 
SET "receiptId" = "Receipt"."id"
FROM "Receipt"
WHERE "Receipt"."paymentId" = "Payment"."id";

-- DropForeignKey: Remove the old foreign key constraint
ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "Receipt_paymentId_fkey";

-- DropIndex: Remove the unique constraint and index on paymentId
DROP INDEX IF EXISTS "Receipt_paymentId_key";
DROP INDEX IF EXISTS "Receipt_paymentId_idx";

-- AlterTable: Remove paymentId column from Receipt
ALTER TABLE "Receipt" DROP COLUMN "paymentId";

-- CreateIndex: Add index on Payment.receiptId
CREATE INDEX "Payment_receiptId_idx" ON "Payment"("receiptId");

-- AddForeignKey: Add foreign key from Payment.receiptId to Receipt.id
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
