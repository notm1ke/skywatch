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

-- CreateTable
CREATE TABLE "airways" (
    "airway_id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "regulatory" BOOLEAN NOT NULL,
    "points" TEXT[]
);

-- CreateIndex
CREATE UNIQUE INDEX "airways_airway_id_location_key" ON "airways"("airway_id", "location");

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
