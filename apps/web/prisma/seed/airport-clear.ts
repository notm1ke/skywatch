import axios from "axios";

import { prisma } from "~/lib/prisma";

type ClearAirportsResponse = {
	[name: string]: boolean;
}

export const seedAirportHasClear = async () => {
	const airports = await axios
		.get<ClearAirportsResponse>("https://api.jetboost.io/filter?boosterId=clodfir5irpvw06240joq8gwh&q=clear-plus&q=tsa-precheck-enrollment")
		.then(res => res.data)
		.catch(err => console.error("[clear] Error retrieving data for Clear+ airports:", err.data?.message || err.message)); 
	
	if (!airports) process.exit(-1);
	
	let affected = 0;
	for (const airport of Object.keys(airports)) {
		const name = '%' + airport
			.replaceAll("-", " ")
			.replace(" airport", "")
			.trim() + '%';
		
		const match = await prisma.$queryRaw<Array<{ iata_code: string }>>`
			select iata_code from airports where
				regexp_replace(
					lower(
						regexp_replace(
							regexp_replace(regexp_replace("name", '''', '', 'g'), '[/\\\\.-]', ' ', 'g'),
							'–', ' ', 'g'
						)
					), '\\s+', ' ', 'g'
				)
				ilike ${name}
				limit 1
		`;
		
		if (match?.length !== 1) {
			console.warn(`[clear] No match for ${airport}`)
			continue;
		}
		
		// todo: if match, take `airport` and fetch https://www.clearme.com/all-locations/{airport}
		// scrape the page, get the terminal info and hours, store it in a new field under `airport`
		// so we can display inline info on the airport inspector page somewhere - need to figure out plan
		// for displaying rich tsa checkpoint info via the checkpoints API (maybe find some extra info
		// somewhere for precheck specific things too)
		
		const { iata_code } = match[0];
		await prisma.airport.update({
			where: { iata_code },
			data: { supports_clear: true }
		});
		
		console.log(`[clear] - ${iata_code}`);
		affected++;
	}
	
	console.log(`[clear] Done updating ${affected} airport${affected === 1 ? "" : "s"}.`);
}

