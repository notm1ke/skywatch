-- DropForeignKey
ALTER TABLE "airport_nav" DROP CONSTRAINT "airport_nav_associated_airport_fkey";

-- DropForeignKey
ALTER TABLE "airport_runways" DROP CONSTRAINT "airport_runways_airport_ref_fkey";

-- AddForeignKey
ALTER TABLE "airport_nav" ADD CONSTRAINT "airport_nav_associated_airport_fkey" FOREIGN KEY ("associated_airport") REFERENCES "airports"("ident") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_runways" ADD CONSTRAINT "airport_runways_airport_ref_fkey" FOREIGN KEY ("airport_ref") REFERENCES "airports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
