/*
  Warnings:

  - You are about to drop the column `resolved_time` on the `airport_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `airport_status_history` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[airport_iata,event_type,observed_at]` on the table `airport_status_history` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `observed_at` to the `airport_status_history` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "airport_status_history_airport_iata_event_type_start_time_key";

-- AlterTable
ALTER TABLE "airport_status_history" DROP COLUMN "resolved_time",
DROP COLUMN "start_time",
ADD COLUMN     "observed_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "resolved_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "airport_status_history_airport_iata_event_type_observed_at_key" ON "airport_status_history"("airport_iata", "event_type", "observed_at");
