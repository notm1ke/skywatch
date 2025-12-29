import axios from "axios";

import { prisma } from "~/lib/prisma";

if (!process.env.RVR_AIRPORTS_STORE) throw new Error(
	"RVR Airports URL is not set."
);

export const seedAirportHasRvrs = async () => {
	const iatas = await axios
		.get<string[]>(process.env.RVR_AIRPORTS_STORE!)
		.then(res => res.data)
		.catch(err => console.error('[rvr] Error retrieving data from the RVR airports store:', err.data?.message || err.message)); 
	
	if (!iatas) process.exit(-1);
	
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
				console.log(`[rvr] - ${iata_code}`);
				return prisma.airport.update({
					where: { iata_code },
					data: { supports_rvr: true }
				});
			})
	);
	
	console.log(`[rvr] Done updating ${iatas.length} airport${iatas.length === 1 ? "" : "s"}.`);
}
