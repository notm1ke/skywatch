import axios from "axios";

import { prisma } from "@/services/prisma";

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

export const seedAirportHasPrecheck = async () => {
	const airports = await axios
		.get<RemoteResponse>("https://www.tsa.gov/ajax/precheck/airports")
		.then(res => res.data.airports)
		.catch(err => console.error('[precheck] Error retrieving data for precheck airports:', err.data?.message || err.message));

	if (!airports) process.exit(-1);

	const iatas = [...new Set(airports.map(entry => entry.airport.airportCode))];
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
				console.log(`[precheck] - ${iata_code}`);
				return prisma.airport.update({
					where: { iata_code },
					data: { supports_precheck: true }
				});
			})
	);

	console.log(`[precheck] Done updating ${iatas.length} airport${iatas.length === 1 ? "" : "s"}.`);
}
