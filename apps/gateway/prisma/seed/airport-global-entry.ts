import axios from "axios";

import { load } from "cheerio";
import { prisma } from "@/services/prisma";

export const seedAirportHasGlobalEntry = async () => {
	const tracked = await prisma
		.airport
		.findMany({
			select: { iata_code: true }
		})
		.then(records => records
			.map(record => record.iata_code)
			.filter(Boolean) as string[]
		);
	
	const pattern = /.*\s\(([A-Z]{3})\)\*?/;
	const airports = await axios
		.get('https://www.cbp.gov/travel/trusted-traveler-programs/global-entry/airports-with-global-entry')
		.then(res => res.data)
		.then(load)
		.then($ => $('.usa-card-group .grid-container .undecorated').map((_, el) => $(el)
			.text()
			.split('\n\t\t')
			.filter(item => !!item)
			.map(item => {
				const [, iata_code] = item.split(pattern)!;
				const enrollment = !item.includes('*');
				return { iata_code, enrollment };
			})
			.filter(entry => tracked.includes(entry.iata_code))
			.sort((a, b) => a.iata_code.localeCompare(b.iata_code)))
			.get());

	
	await prisma.$transaction(
		airports.map(({ iata_code, enrollment }) => {
			console.log(`[global entry] - ${iata_code}`);
			return prisma.airport.update({
				where: { iata_code },
				data: {
					supports_global_entry: true,
					supports_ge_enrollment: enrollment
				}
			});
		})
	);
}