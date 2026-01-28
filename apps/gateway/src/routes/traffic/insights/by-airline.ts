import { z } from "zod/v4";
import { base } from "@/utils";
import { TrafficFlow } from "@/schemas";
import { prisma } from "@/services/prisma";
import { Prisma } from "@/prisma/generated/client";
import { injectDataMarker } from "@/middleware/traffic-marker";

export type CommonAirlineType = typeof CommonAirlines[number];

const CommonAirlines = [
	"AAL", "SWA", "DAL", "UAL", "FDX", "ASA", "JBU", "UPS", "NKS",
	"FFT", "AAY", "HAL", "BAW", "DLH", "UAE", "QTR", "ACA", "AFR",
	"KLM", "ANA", "THY", "CPA", "SIA", "EVA", "ETH"
] as const;

type QueryResponse = {
	airline: string;
	flights: number;
}

export const aircraft = base
export const airline = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
		const records = await prisma.$queryRaw<QueryResponse[]>`
			SELECT 
				(flight->>'majorAirline') AS airline,
				COUNT(*)::int AS flights
			FROM airport_traffic_record,
			LATERAL jsonb_array_elements(flights::jsonb) AS flight
			WHERE 1=1
				AND (flight->>'majorAirline') IN (${Prisma.join(CommonAirlines)})
				AND day = ${marker.day}
				AND month = ${marker.month}
				AND year = ${marker.year}
			GROUP BY airline 
			ORDER BY flights DESC
		`;

		const tracked = new Set<string>();
		const datum = {} as Record<string, number>;
		let cumulative = 0;
		
		for (const { airline, flights } of records) {
			if (!tracked.has(airline)) tracked.add(airline);
			datum[airline] = flights;
			cumulative += flights;
		}

		// d3 treechart, not recharts, so this is a non-standard response
		const flow: TrafficFlow<string> = {
			config: {},
			dataKeys: Array.from(tracked),
			data: [
				{
					time: "",
					datum,
					cumulative
				}
			]
		}

		return flow;
	})

