import axios from "axios";

import { prisma } from "~/services/prisma";

if (!process.env.AIRLINE_HUBS_STORE) throw new Error(
	"Airline hubs store URL is not set."
);

type RemoteAirlineRecord = {
	airline: string;
	hubs: Array<{
		airport: string;
		terminals: string[];
		type: "hub" | "focus_city"
	}>
}

export const seedAirlineHubs = async () => {
	const records = await axios
		.get(process.env.AIRLINE_HUBS_STORE!)
		.then(res => res.data as RemoteAirlineRecord[])
		.catch(err => console.error('[hubs] Error retrieving data from the airline hub store:', err.data?.message || err.message));

	if (!records) process.exit(-1);

	let affected = 0;
	for (const record of records) {
		console.log(`[hubs] - ${record.airline} (${record.hubs.length} entr${record.hubs.length === 1 ? "y" : "ies"})`);

		// detect and purge stale records
		const existing = await prisma.airportAirlineHub.findMany({ where: { airline_iata: record.airline } });
		const staleHubs = existing.filter(existingHub => !record.hubs.some(hub => hub.airport === existingHub.airport_iata));
		if (staleHubs.length) {
			console.log(`[hubs] Pruning ${staleHubs.length} detected stale hub${staleHubs.length === 1 ? "" : "s"}:`);
			console.log(`[hubs] ${staleHubs.map(hub => hub.airport_iata).join(', ')}`)
			await prisma.airportAirlineHub.deleteMany({
				where: {
					airline_iata: record.airline,
					airport_iata: {
						in: staleHubs.map(hub => hub.airport_iata)
					}
				}
			});
		}

		// upsert the rest
		for (const hub of record.hubs) {
			const airport = await prisma.airport.findFirst({ where: { iata_code: hub.airport } });
			if (!airport) {
				console.warn(`[hubs]   - Skipped ${hub.airport} because we don't track it`)
				continue;
			}

			await prisma.airportAirlineHub.upsert({
				where: {
					airline_iata_airport_iata: {
						airline_iata: record.airline,
						airport_iata: hub.airport
					}
				},
				create: {
					airport: { connect: { iata_code: hub.airport } },
					airline_iata: record.airline,
					terminals: hub.terminals,
					type: hub.type
				},
				update: {
					terminals: hub.terminals
				}
			})
			.then(() => affected++)
			.catch(err => console.error(
				'[hubs] Error upserting airline hub info',
				{ input: { airline_iata: record.airline, airport_iata: hub.airport } },
				{ error: err }
			));
		}
	}

	console.log(`[hubs] Modified ${affected} airline hub record${affected === 1 ? '' : 's'}.`);
}
