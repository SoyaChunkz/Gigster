-- DropIndex
DROP INDEX "TxnStore_signature_key";

-- AlterTable
ALTER TABLE "TxnStore" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 10000000;
