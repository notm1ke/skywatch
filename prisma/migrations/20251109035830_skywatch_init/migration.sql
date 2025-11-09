-- CreateTable
CREATE TABLE "airports" (
    "id" INTEGER NOT NULL,
    "ident" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude_deg" DOUBLE PRECISION NOT NULL,
    "longitude_deg" DOUBLE PRECISION NOT NULL,
    "elevation_ft" INTEGER,
    "continent" TEXT,
    "iso_country" TEXT,
    "iso_region" TEXT,
    "municipality" TEXT,
    "scheduled_service" TEXT,
    "icao_code" TEXT,
    "iata_code" TEXT,
    "gps_code" TEXT,
    "local_code" TEXT,
    "home_link" TEXT,
    "wikipedia_link" TEXT,
    "keywords" TEXT,
    "supports_map" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_frequencies" (
    "id" INTEGER NOT NULL,
    "airport_ref" INTEGER NOT NULL,
    "airport_ident" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "frequency_mhz" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "airport_frequencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_nav" (
    "id" INTEGER NOT NULL,
    "filename" TEXT,
    "ident" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frequency_khz" INTEGER,
    "latitude_deg" DOUBLE PRECISION,
    "longitude_deg" DOUBLE PRECISION,
    "elevation_ft" INTEGER,
    "iso_country" TEXT,
    "dme_frequency_khz" INTEGER,
    "dme_channel" TEXT,
    "dme_latitude_deg" DOUBLE PRECISION,
    "dme_longitude_deg" DOUBLE PRECISION,
    "dme_elevation_ft" INTEGER,
    "slaved_variation_deg" DOUBLE PRECISION,
    "magnetic_variation_deg" DOUBLE PRECISION,
    "usageType" TEXT,
    "power" TEXT,
    "associated_airport" TEXT,

    CONSTRAINT "airport_nav_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_runways" (
    "id" INTEGER NOT NULL,
    "airport_ref" INTEGER NOT NULL,
    "airport_ident" TEXT NOT NULL,
    "length_ft" INTEGER,
    "width_ft" INTEGER,
    "surface" TEXT,
    "lighted" BOOLEAN,
    "closed" BOOLEAN,
    "le_ident" TEXT,
    "le_latitude_deg" DOUBLE PRECISION,
    "le_longitude_deg" DOUBLE PRECISION,
    "le_elevation_ft" INTEGER,
    "le_heading_degT" DOUBLE PRECISION,
    "le_displaced_threshold_ft" INTEGER,
    "he_ident" TEXT,
    "he_latitude_deg" DOUBLE PRECISION,
    "he_longitude_deg" DOUBLE PRECISION,
    "he_elevation_ft" INTEGER,
    "he_heading_degT" DOUBLE PRECISION,
    "he_displaced_threshold_ft" INTEGER,

    CONSTRAINT "airport_runways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_airline_hubs" (
    "airline_iata" TEXT NOT NULL,
    "airport_iata" TEXT NOT NULL,
    "terminals" TEXT[]
);

-- CreateIndex
CREATE UNIQUE INDEX "airports_ident_key" ON "airports"("ident");

-- CreateIndex
CREATE UNIQUE INDEX "airports_icao_code_key" ON "airports"("icao_code");

-- CreateIndex
CREATE UNIQUE INDEX "airports_iata_code_key" ON "airports"("iata_code");

-- CreateIndex
CREATE UNIQUE INDEX "airport_airline_hubs_airline_iata_airport_iata_key" ON "airport_airline_hubs"("airline_iata", "airport_iata");

-- AddForeignKey
ALTER TABLE "airport_frequencies" ADD CONSTRAINT "airport_frequencies_airport_ref_fkey" FOREIGN KEY ("airport_ref") REFERENCES "airports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_nav" ADD CONSTRAINT "airport_nav_associated_airport_fkey" FOREIGN KEY ("associated_airport") REFERENCES "airports"("ident") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_runways" ADD CONSTRAINT "airport_runways_airport_ref_fkey" FOREIGN KEY ("airport_ref") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_airline_hubs" ADD CONSTRAINT "airport_airline_hubs_airport_iata_fkey" FOREIGN KEY ("airport_iata") REFERENCES "airports"("iata_code") ON DELETE RESTRICT ON UPDATE CASCADE;
