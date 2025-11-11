/*
  Warnings:

  - You are about to drop the column `arrivalRates` on the `airport_traffic` table. All the data in the column will be lost.
  - You are about to drop the column `defaultArrivalRate` on the `airport_traffic` table. All the data in the column will be lost.
  - Added the required column `default_arrival_rate` to the `airport_traffic` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "airport_traffic" DROP COLUMN "arrivalRates",
DROP COLUMN "defaultArrivalRate",
ADD COLUMN     "arrival_rates" INTEGER[],
ADD COLUMN     "default_arrival_rate" INTEGER NOT NULL;
