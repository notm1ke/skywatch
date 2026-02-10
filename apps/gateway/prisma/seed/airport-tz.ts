import axios from "axios";

import { prisma } from "@/services/prisma";

if (!process.env.AIRPORT_TZ_STORE) throw new Error(
	"Airport timezone store URL is not set."
);

type RemoteTzRecord = {
	iata: string;
	tz: string;
}

export const seedAirportTimezones = async () => {
	const records = await axios
		.get(process.env.AIRPORT_TZ_STORE!)
		.then(res => res.data as RemoteTzRecord[])
		.catch(err => console.error('[tz] Error retrieving data from the airport timezone store:', err.data?.message || err.message));

	if (!records) process.exit(-1);

	const tzMap = new Map(records.map(entry => [entry.iata, entry.tz]));
	const iatas = [...new Set(records.map(entry => entry.iata))];
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
				console.log(`[tz] - ${iata_code}`);
				return prisma.airport.update({
					where: { iata_code },
					data: { timezone: tzMap.get(iata_code) }
				});
			})
	);

	console.log(`[tz] Done updating ${iatas.length} airport${iatas.length === 1 ? "" : "s"}.`);
}
