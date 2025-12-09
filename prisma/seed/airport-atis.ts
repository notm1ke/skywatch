import axios from "axios";

import { prisma } from "~/lib/prisma";

const icaos = await axios
	.get<string[]>("https://atis.info/api/stations")
	.then(res => res.data)
	.catch(err => console.error('[*] Error retrieving data for ATIS-enabled airports:', err.data?.message || err.message)); 

if (!icaos?.length) process.exit(-1);

const tracked = await prisma
	.airport
	.findMany({
		select: { icao_code: true, supports_atis: true }
	}) as Array<{ icao_code: string, supports_atis: boolean }>;

const stale = tracked
	.filter(({ icao_code, supports_atis }) => supports_atis && icao_code && !icaos.includes(icao_code))
	.map(({ icao_code }) => icao_code)
	.filter(Boolean) as string[];

await prisma.$transaction([
	...stale.map(icao_code => {
		console.log(` - Stale: ${icao_code}`);
		return prisma.airport.update({
			where: { icao_code },
			data: { supports_atis: false }
		})
	}),
	...icaos
		.filter(icao => {
			const record = tracked.find(r => r.icao_code === icao);
			return record && !record.supports_atis;
		})
		.map(icao_code => {
			console.log(` - Updated: ${icao_code}`);
			return prisma.airport.update({
				where: { icao_code },
				data: { supports_atis: true }
			})
		})
]);

console.log(`Done updating ${icaos.length} airport${icaos.length === 1 ? "" : "s"}.`);