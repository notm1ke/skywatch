-- CreateEnum
CREATE TYPE "AirportInterruptionType" AS ENUM ('airport_closure', 'ground_stop', 'ground_delay', 'dual_delay', 'arrival_delay', 'departure_delay');

-- CreateTable
CREATE TABLE "airport_status_history" (
    "airport_iata" TEXT NOT NULL,
    "event_type" "AirportInterruptionType" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "resolved_time" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "airport_status_history_airport_iata_event_type_start_time_key" ON "airport_status_history"("airport_iata", "event_type", "start_time");

-- AddForeignKey
ALTER TABLE "airport_status_history" ADD CONSTRAINT "airport_status_history_airport_iata_fkey" FOREIGN KEY ("airport_iata") REFERENCES "airports"("iata_code") ON DELETE RESTRICT ON UPDATE CASCADE;
