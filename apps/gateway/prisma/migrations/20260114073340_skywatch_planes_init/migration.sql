-- CreateTable
CREATE TABLE "aircraft" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "aircraft_type" TEXT NOT NULL,
    "aircraft_weight" TEXT NOT NULL,
    "aircraft_category" TEXT NOT NULL,
    "engine_type" TEXT NOT NULL,
    "build_cert" TEXT NOT NULL,
    "engines" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,
    "type_cert_data_sheet" TEXT NOT NULL,
    "type_cert_data_holder" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "engines" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "engine_type" TEXT NOT NULL,
    "horsepower" TEXT NOT NULL,
    "thrust" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "plane_registrations" (
    "n_number" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "unique_id" TEXT NOT NULL,
    "mode_s" TEXT NOT NULL,
    "mode_s_hex" TEXT NOT NULL,
    "aircraft_id" TEXT NOT NULL,
    "aircraft_type" TEXT NOT NULL,
    "engine_id" TEXT NOT NULL,
    "engine_type" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_street" TEXT NOT NULL,
    "owner_street2" TEXT NOT NULL,
    "owner_city" TEXT NOT NULL,
    "owner_state" TEXT NOT NULL,
    "owner_zip_code" TEXT NOT NULL,
    "owner_region" TEXT NOT NULL,
    "owner_county" TEXT NOT NULL,
    "owner_country" TEXT NOT NULL,
    "owner_names" TEXT[],
    "fractionally_owned" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "mfg_year" TEXT NOT NULL,
    "registrant_type" TEXT NOT NULL,
    "last_action_date" TEXT NOT NULL,
    "airworthy_date" TEXT NOT NULL,
    "expiration_date" TEXT NOT NULL,
    "cert_type" TEXT NOT NULL,
    "cert_issue_date" TEXT NOT NULL,
    "kit_manufacturer" TEXT NOT NULL,
    "kit_model" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_id_key" ON "aircraft"("id");

-- CreateIndex
CREATE UNIQUE INDEX "engines_id_key" ON "engines"("id");

-- CreateIndex
CREATE UNIQUE INDEX "plane_registrations_n_number_key" ON "plane_registrations"("n_number");

-- AddForeignKey
ALTER TABLE "plane_registrations" ADD CONSTRAINT "plane_registrations_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plane_registrations" ADD CONSTRAINT "plane_registrations_engine_id_fkey" FOREIGN KEY ("engine_id") REFERENCES "engines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
