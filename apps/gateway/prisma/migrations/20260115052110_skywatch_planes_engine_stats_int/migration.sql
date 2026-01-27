/*
  Warnings:

  - Changed the type of `horsepower` on the `engines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `thrust` on the `engines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "engines" DROP COLUMN "horsepower",
ADD COLUMN     "horsepower" INTEGER NOT NULL,
DROP COLUMN "thrust",
ADD COLUMN     "thrust" INTEGER NOT NULL;
