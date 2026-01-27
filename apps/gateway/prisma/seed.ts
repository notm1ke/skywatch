import { redis } from "@/services/redis";
import { prisma } from "@/services/prisma";
import { seedPlanes } from "./seed/planes";
import { seedAirports } from "./seed/airport";
import { seedAirlineHubs } from "./seed/airline-hubs";
import { seedAirportHasRvrs } from "./seed/airport-rvr";
import { seedAirportHasAtis } from "./seed/airport-atis";
import { seedAirportHasClear } from "./seed/airport-clear";
import { seedAirportHasPrecheck } from "./seed/airport-precheck";

const gap = 5 * 60 * 1000;
const lastSeededTime = await redis.get("db:seed");
if (lastSeededTime) {
	const delta = Date.now() - parseInt(lastSeededTime);
	if (delta < gap) {
		console.log(`Database was recently seeded, skipping.`);
		process.exit(0);
	} else {
		console.log(`Database was last seeded ${delta}ms ago`);
	}
}

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
await seedAirportHasRvrs();

// planes
await seedPlanes();

console.log(`Finished seeding database in ${(Date.now() - start).toFixed(2)}ms.`);
await redis.set("db:seed", start);

// explicitly cleanup otherwise turbo build gets stuck
await prisma.$disconnect();
process.exit(0);