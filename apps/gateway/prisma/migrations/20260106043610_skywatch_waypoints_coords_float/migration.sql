/*
  Warnings:

  - Changed the type of `latitude_deg` on the `waypoints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `longitude_deg` on the `waypoints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "waypoints" DROP COLUMN "latitude_deg",
ADD COLUMN     "latitude_deg" DOUBLE PRECISION NOT NULL,
DROP COLUMN "longitude_deg",
ADD COLUMN     "longitude_deg" DOUBLE PRECISION NOT NULL;
