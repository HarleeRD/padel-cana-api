-- AlterTable
ALTER TABLE "app"."Club" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Santo_Domingo';

-- AlterTable
ALTER TABLE "app"."Booking" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
