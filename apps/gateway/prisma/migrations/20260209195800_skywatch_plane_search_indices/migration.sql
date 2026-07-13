-- DropIndex
DROP INDEX "aircraft_manufacturer_model_engines_engine_type_seats_idx";

-- DropIndex
DROP INDEX "plane_registrations_aircraft_type_engine_type_owner_name_st_idx";

-- CreateIndex
CREATE INDEX "aircraft_manufacturer_idx" ON "aircraft"("manufacturer" text_pattern_ops);

-- CreateIndex
CREATE INDEX "aircraft_model_idx" ON "aircraft"("model" text_pattern_ops);

-- CreateIndex
CREATE INDEX "plane_registrations_aircraft_type_engine_type_status_idx" ON "plane_registrations"("aircraft_type", "engine_type", "status");

-- CreateIndex
CREATE INDEX "plane_registrations_owner_name_idx" ON "plane_registrations"("owner_name" text_pattern_ops);

-- CreateIndex
CREATE INDEX "plane_registrations_n_number_idx" ON "plane_registrations"("n_number" text_pattern_ops);

-- CreateIndex
CREATE INDEX "waypoints_waypoint_id_idx" ON "waypoints"("waypoint_id" text_pattern_ops);
