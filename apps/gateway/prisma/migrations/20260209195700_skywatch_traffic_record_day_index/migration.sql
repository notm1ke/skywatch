-- CreateIndex
CREATE INDEX "airport_traffic_record_year_month_day_idx" ON "airport_traffic_record"("year", "month", "day");

-- CreateIndex
CREATE INDEX "airports_artcc_idx" ON "airports"("artcc");
