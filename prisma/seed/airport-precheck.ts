import axios from "axios";

import { PrismaClient } from "~/prisma/generated/client";

type RemoteResponse = {
	airports: PrecheckAirport[];
}

type PrecheckAirport = {
	airport: {
		"0": {
			"@thoroughfare": string;
			"@locality": string;
			"@state": string;
			"@postal-code": string;
			"@country": string;
		};
		title: string;
		latitude: number;
		longitude: number;
		geofieldWKT: `POINT (${number} ${number})`;
		address: string;
		airportCode: string;
		state: string;
		description: string;
		titleLink: string;
		airline: string;
	}
}

const airports = await axios
	.get<RemoteResponse>("https://www.tsa.gov/ajax/precheck/airports")
	.then(res => res.data.airports)
	.catch(err => console.error('[*] Error retrieving data for precheck airports:', err.data?.message || err.message)); 

if (!airports) process.exit(-1);

const iatas = [...new Set(airports.map(entry => entry.airport.airportCode))];
const prisma = new PrismaClient();
const tracked = await prisma
	.airport
	.findMany({
		select: { iata_code: true }
	})
	.then(records => records
		.map(record => record.iata_code)
		.filter(Boolean) as string[]
	);

await prisma.$transaction(
	iatas
		.filter(iata => tracked.includes(iata))
		.map(iata_code => {
			console.log(` - ${iata_code}`);
			return prisma.airport.update({
				where: { iata_code },
				data: { supports_precheck: true }
			});
		})
);

console.log(`Done updating ${iatas.length} airport${iatas.length === 1 ? "" : "s"}.`);