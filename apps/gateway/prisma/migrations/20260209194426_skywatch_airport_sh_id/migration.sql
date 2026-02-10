/*
  Warnings:

  - Added the required column `event_id` to the `airport_status_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "airport_status_history" ADD COLUMN     "event_id" TEXT NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "airport_status_history_pkey" PRIMARY KEY ("event_id");
