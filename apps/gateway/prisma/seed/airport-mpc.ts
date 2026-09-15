import axios from "axios";

import { load } from "cheerio";
import { prisma } from "@/services/prisma";

export const seedAirportHasMpc = async () => {
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
	const iatas = await axios
		.get('https://www.cbp.gov/travel/us-citizens/mobile-passport-control')
		.then(res => res.data)
		.then(load)
		.then($ => $('.field--name-field-uswds-text > ul:nth-child(3) > li').map((_, el) => $(el)
			.text()).get().filter(item => !!item)
			.map(item => item.split(pattern)[1])
			.filter(entry => tracked.includes(entry))
			.sort((a, b) => a.localeCompare(b)));

	await prisma.$transaction(
		iatas.map(iata_code => {
			console.log(`[mpc] - ${iata_code}`);
			return prisma.airport.update({
				where: { iata_code },
				data: { supports_mpc: true }
			});
		})
	);
}