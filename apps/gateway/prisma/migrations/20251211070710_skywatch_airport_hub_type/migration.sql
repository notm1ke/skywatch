/*
  Warnings:

  - Added the required column `type` to the `airport_airline_hubs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AirportHubType" AS ENUM ('hub', 'focus_city');

-- AlterTable
ALTER TABLE "airport_airline_hubs" ADD COLUMN     "type" "AirportHubType" NOT NULL;
