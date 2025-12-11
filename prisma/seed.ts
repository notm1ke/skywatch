import { seedAirports } from "./seed/airport";
import { seedAirlineHubs } from "./seed/airline-hubs";
import { seedAirportHasRvrs } from "./seed/airport-rvr";
import { seedAirportHasAtis } from "./seed/airport-atis";
import { seedAirportHasClear } from "./seed/airport-clear";
import { seedAirportHasPrecheck } from "./seed/airport-precheck";

const start = Date.now();
console.log('Seeding database..');

// base table
await seedAirports();

// airline hubs model
await seedAirlineHubs();

// support fields
await seedAirportHasAtis();
await seedAirportHasClear();
await seedAirportHasPrecheck();
await seedAirportHasRvrs()

console.log(`Finished seeding database in ${(Date.now() - start).toFixed(2)}ms.`)