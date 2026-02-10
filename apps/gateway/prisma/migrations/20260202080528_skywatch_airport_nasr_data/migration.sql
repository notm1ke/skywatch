/*
  Warnings:

  - Made the column `continent` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `iso_country` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `iso_region` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `municipality` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `icao_code` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `iata_code` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gps_code` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `local_code` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `home_link` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `wikipedia_link` on table `airports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `keywords` on table `airports` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "airports" ADD COLUMN     "artcc" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "atc_type" TEXT,
ADD COLUMN     "fss_number" TEXT,
ADD COLUMN     "fuel_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "has_cbp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inspection_date" TIMESTAMP(3),
ADD COLUMN     "inspection_type" TEXT,
ADD COLUMN     "inspector_type" TEXT,
ADD COLUMN     "mil_joint_use" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mil_ldg_rights" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nasp_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rescue_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "continent" SET NOT NULL,
ALTER COLUMN "iso_country" SET NOT NULL,
ALTER COLUMN "iso_region" SET NOT NULL,
ALTER COLUMN "municipality" SET NOT NULL,
ALTER COLUMN "icao_code" SET NOT NULL,
ALTER COLUMN "iata_code" SET NOT NULL,
ALTER COLUMN "gps_code" SET NOT NULL,
ALTER COLUMN "local_code" SET NOT NULL,
ALTER COLUMN "home_link" SET NOT NULL,
ALTER COLUMN "home_link" SET DEFAULT '',
ALTER COLUMN "wikipedia_link" SET NOT NULL,
ALTER COLUMN "wikipedia_link" SET DEFAULT '',
ALTER COLUMN "keywords" SET NOT NULL,
ALTER COLUMN "keywords" SET DEFAULT '';
