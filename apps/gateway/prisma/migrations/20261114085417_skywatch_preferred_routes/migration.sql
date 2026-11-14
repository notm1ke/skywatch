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
ALTER TABLE "airport_traffic_record" ADD COLUMN     "aar" INTEGER;

-- CreateTable
CREATE TABLE "preferred_routes" (
    "route_id" TEXT NOT NULL,
    "route_type" TEXT NOT NULL,
    "route_string" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "origin_iata" TEXT NOT NULL,
    "origin_artcc" TEXT NOT NULL,
    "dest_iata" TEXT NOT NULL,
    "dest_artcc" TEXT NOT NULL,
    "hour_1" TEXT,
    "hour_2" TEXT,
    "hour_3" TEXT,
    "area" TEXT,
    "aircraft" TEXT,
    "altitude" TEXT,
    "direction" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "preferred_routes_route_id_key" ON "preferred_routes"("route_id");

-- CreateIndex
CREATE INDEX "preferred_routes_dest_iata_idx" ON "preferred_routes"("dest_iata");

-- CreateIndex
CREATE INDEX "preferred_routes_origin_artcc_dest_artcc_idx" ON "preferred_routes"("origin_artcc", "dest_artcc");

-- CreateIndex
CREATE INDEX "preferred_routes_dest_artcc_idx" ON "preferred_routes"("dest_artcc");

-- CreateIndex
CREATE UNIQUE INDEX "preferred_routes_origin_iata_dest_iata_route_type_sequence_key" ON "preferred_routes"("origin_iata", "dest_iata", "route_type", "sequence");

-- CreateIndex
CREATE INDEX "aircraft_manufacturer_idx" ON "aircraft"("manufacturer" text_pattern_ops);

-- CreateIndex
CREATE INDEX "aircraft_model_idx" ON "aircraft"("model" text_pattern_ops);

-- CreateIndex
CREATE INDEX "airport_status_history_airport_iata_observed_at_idx" ON "airport_status_history"("airport_iata", "observed_at");

-- CreateIndex
CREATE INDEX "plane_registrations_owner_name_idx" ON "plane_registrations"("owner_name" text_pattern_ops);

-- CreateIndex
CREATE INDEX "plane_registrations_n_number_idx" ON "plane_registrations"("n_number" text_pattern_ops);

-- CreateIndex
CREATE INDEX "waypoints_waypoint_id_idx" ON "waypoints"("waypoint_id" text_pattern_ops);
