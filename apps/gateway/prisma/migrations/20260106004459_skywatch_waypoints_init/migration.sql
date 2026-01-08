-- CreateTable
CREATE TABLE "waypoints" (
    "waypoint_id" TEXT NOT NULL,
    "waypoint_use_code" TEXT NOT NULL,
    "effective_date" TEXT NOT NULL,
    "icao_region_code" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "latitude_deg" TEXT NOT NULL,
    "longitude_deg" TEXT NOT NULL,
    "charts" TEXT[],
    "charting_remark" TEXT NOT NULL,
    "compulsary" TEXT NOT NULL,
    "artcc_id_high" TEXT NOT NULL,
    "artcc_id_low" TEXT NOT NULL,
    "min_reception_alt" INTEGER NOT NULL,
    "pitch_flag" TEXT NOT NULL,
    "catch_flag" TEXT NOT NULL,
    "special_use_flag" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "waypoints_waypoint_id_key" ON "waypoints"("waypoint_id");
