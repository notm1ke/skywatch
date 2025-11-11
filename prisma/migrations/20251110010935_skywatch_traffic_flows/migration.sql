-- CreateTable
CREATE TABLE "airport_traffic" (
    "iata_code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "defaultArrivalRate" INTEGER NOT NULL,
    "arrivalRates" INTEGER[],
    "fixes" TEXT[]
);

-- CreateTable
CREATE TABLE "airport_traffic_record" (
    "iata_code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "counts" JSONB NOT NULL,
    "flights" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "airport_traffic_iata_code_year_month_day_key" ON "airport_traffic"("iata_code", "year", "month", "day");

-- CreateIndex
CREATE UNIQUE INDEX "airport_traffic_record_iata_code_year_month_day_time_key" ON "airport_traffic_record"("iata_code", "year", "month", "day", "time");

-- AddForeignKey
ALTER TABLE "airport_traffic" ADD CONSTRAINT "airport_traffic_iata_code_fkey" FOREIGN KEY ("iata_code") REFERENCES "airports"("iata_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_traffic_record" ADD CONSTRAINT "airport_traffic_record_iata_code_year_month_day_fkey" FOREIGN KEY ("iata_code", "year", "month", "day") REFERENCES "airport_traffic"("iata_code", "year", "month", "day") ON DELETE RESTRICT ON UPDATE CASCADE;
