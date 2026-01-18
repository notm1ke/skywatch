/*
  Warnings:

  - Changed the type of `last_action_date` on the `plane_registrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `airworthy_date` on the `plane_registrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `expiration_date` on the `plane_registrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `cert_issue_date` on the `plane_registrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "plane_registrations" ALTER COLUMN "owner_street2" DROP NOT NULL,
DROP COLUMN "last_action_date",
ADD COLUMN     "last_action_date" TIMESTAMP(3) NOT NULL,
DROP COLUMN "airworthy_date",
ADD COLUMN     "airworthy_date" TIMESTAMP(3) NOT NULL,
DROP COLUMN "expiration_date",
ADD COLUMN     "expiration_date" TIMESTAMP(3) NOT NULL,
DROP COLUMN "cert_issue_date",
ADD COLUMN     "cert_issue_date" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "kit_manufacturer" DROP NOT NULL,
ALTER COLUMN "kit_model" DROP NOT NULL;
