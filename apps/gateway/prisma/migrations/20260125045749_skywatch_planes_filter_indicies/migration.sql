-- CreateIndex
CREATE INDEX "aircraft_manufacturer_model_engines_engine_type_seats_idx" ON "aircraft"("manufacturer", "model", "engines", "engine_type", "seats");

-- CreateIndex
CREATE INDEX "engines_manufacturer_model_engine_type_idx" ON "engines"("manufacturer", "model", "engine_type");

-- CreateIndex
CREATE INDEX "plane_registrations_aircraft_type_engine_type_owner_name_st_idx" ON "plane_registrations"("aircraft_type", "engine_type", "owner_name", "status");
