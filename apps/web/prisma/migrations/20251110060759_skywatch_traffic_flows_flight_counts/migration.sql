-- AlterTable
ALTER TABLE "airport_traffic" ADD COLUMN     "cancelled_flights" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_flights" INTEGER NOT NULL DEFAULT 0;
