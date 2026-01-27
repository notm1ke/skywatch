-- DropForeignKey
ALTER TABLE "plane_registrations" DROP CONSTRAINT "plane_registrations_engine_id_fkey";

-- AlterTable
ALTER TABLE "plane_registrations" ALTER COLUMN "engine_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "plane_registrations" ADD CONSTRAINT "plane_registrations_engine_id_fkey" FOREIGN KEY ("engine_id") REFERENCES "engines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
