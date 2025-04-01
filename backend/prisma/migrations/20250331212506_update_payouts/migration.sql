-- AlterTable
ALTER TABLE "Payouts" ALTER COLUMN "signature" DROP NOT NULL,
ALTER COLUMN "signature" SET DEFAULT '';
