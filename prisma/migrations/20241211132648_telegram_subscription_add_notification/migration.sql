-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "expireSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expireSoonSent" BOOLEAN NOT NULL DEFAULT false;
