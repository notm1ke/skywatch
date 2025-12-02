/*
  Warnings:

  - You are about to drop the column `supports_map` on the `airports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "airports" DROP COLUMN "supports_map",
ADD COLUMN     "supports_rvr" BOOLEAN NOT NULL DEFAULT false;
