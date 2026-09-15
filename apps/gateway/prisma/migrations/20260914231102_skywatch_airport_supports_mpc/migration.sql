-- DropIndex
DROP INDEX "aircraft_manufacturer_idx";

-- DropIndex
DROP INDEX "aircraft_model_idx";

-- DropIndex
DROP INDEX "plane_registrations_n_number_idx";

-- DropIndex
DROP INDEX "plane_registrations_owner_name_idx";

-- DropIndex
DROP INDEX "waypoints_waypoint_id_idx";

-- AlterTable
ALTER TABLE "airports" ADD COLUMN     "supports_mpc" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "aircraft_manufacturer_idx" ON "aircraft"("manufacturer" text_pattern_ops);

-- CreateIndex
CREATE INDEX "aircraft_model_idx" ON "aircraft"("model" text_pattern_ops);

-- CreateIndex
CREATE INDEX "plane_registrations_owner_name_idx" ON "plane_registrations"("owner_name" text_pattern_ops);

-- CreateIndex
CREATE INDEX "plane_registrations_n_number_idx" ON "plane_registrations"("n_number" text_pattern_ops);

-- CreateIndex
CREATE INDEX "waypoints_waypoint_id_idx" ON "waypoints"("waypoint_id" text_pattern_ops);
