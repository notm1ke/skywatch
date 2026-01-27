-- AlterTable
ALTER TABLE "plane_registrations" ALTER COLUMN "mfg_year" DROP NOT NULL,
ALTER COLUMN "cert_type" DROP NOT NULL,
ALTER COLUMN "last_action_date" DROP NOT NULL,
ALTER COLUMN "airworthy_date" DROP NOT NULL,
ALTER COLUMN "expiration_date" DROP NOT NULL,
ALTER COLUMN "cert_issue_date" DROP NOT NULL;
