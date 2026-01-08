/*
  Warnings:

  - You are about to drop the column `compulsary` on the `waypoints` table. All the data in the column will be lost.
  - Added the required column `compulsory` to the `waypoints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "waypoints" DROP COLUMN "compulsary",
ADD COLUMN     "compulsory" TEXT NOT NULL;
