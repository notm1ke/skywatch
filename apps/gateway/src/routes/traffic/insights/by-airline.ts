import { TrafficFlow } from "@/schemas";
import { prisma } from "@/services/prisma";
import { airspaceInput, base } from "@/utils";
import { Prisma } from "@/prisma/generated/client";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { trafficScopeSql } from "@/services/traffic-scope";

export type CommonAirlineType = typeof CommonAirlines[number];

const CommonAirlines = [
	"AAL", "SWA", "DAL", "UAL", "FDX", "ASA", "JBU", "UPS",
	"FFT", "AAY", "HAL", "BAW", "DLH", "UAE", "QTR", "ACA", "AFR",
	"KLM", "ANA", "THY", "CPA", "SIA", "EVA", "ETH"
] as const;

type QueryResponse = {
	airline: string;
	flights: number;
}

export const airline = base
	.input(airspaceInput)
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input }) => {
		const scopeFilter = trafficScopeSql(input);
		// national views only track the big carriers; a single airport shows everyone
		const allowlist = input.airport
			? Prisma.sql`AND (flight->>'majorAirline') <> ''`
			: Prisma.sql`AND (flight->>'majorAirline') IN (${Prisma.join(CommonAirlines)})`;

		const records = await prisma.$queryRaw<QueryResponse[]>`
			SELECT
				(flight->>'majorAirline') AS airline,
				COUNT(*)::int AS flights
			FROM airport_traffic_record,
			LATERAL jsonb_array_elements(flights::jsonb) AS flight
			WHERE 1=1
				${allowlist}
				AND day = ${marker.day}
				AND month = ${marker.month}
				AND year = ${marker.year}
				${scopeFilter}
			GROUP BY airline
			ORDER BY flights DESC
		`;

		const tracked = new Set<string>();
		const datum = {} as Record<string, number>;
		let cumulative = 0;
		
		// a single airport shows every airline it sees; the national view is already limited to the allowlist
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

