/*
  Warnings:

  - Changed the type of `pitch_flag` on the `waypoints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `catch_flag` on the `waypoints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "waypoints" DROP COLUMN "pitch_flag",
ADD COLUMN     "pitch_flag" BOOLEAN NOT NULL,
DROP COLUMN "catch_flag",
ADD COLUMN     "catch_flag" BOOLEAN NOT NULL;
