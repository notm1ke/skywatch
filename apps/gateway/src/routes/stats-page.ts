import { z } from "zod/v4";
import { base } from "~/utils";
import { prisma } from "~/services/prisma";

export type HeaderStats = {
	top10: Array<{
		iata_code: string;
		iso_region: string;
		name: string;
		flights: number;
	}>;
	total: number;
}

export const statsPage = base
	.input(z.void())
	.handler(async () => prisma.$transaction([
		prisma.$queryRaw<HeaderStats['top10']>`
			SELECT t.iata_code, a.iso_region, a.name, sum(t.total_flights)::int as flights
			FROM airport_traffic t
			JOIN airports a ON t.iata_code = a.iata_code
			GROUP BY t.iata_code, a.name, a.iso_region
			ORDER BY SUM(total_flights) DESC
			LIMIT 10
		`,
		prisma.airportTrafficFlow.aggregate({
			_sum: {
				total_flights: true
			}
		})
	]).then(([top10, total]) => ({
		top10, total: total._sum.total_flights
	})));
