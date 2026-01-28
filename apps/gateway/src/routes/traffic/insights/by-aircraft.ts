import { z } from "zod/v4";
import { base } from "@/utils";
import { TrafficFlow } from "@/schemas";
import { prisma } from "@/services/prisma";
import { Prisma } from "@/prisma/generated/client";
import { injectDataMarker } from "@/middleware/traffic-marker";

export type CommonPaxAircraftType = typeof CommonPaxAircraft[number];

const CommonPaxAircraft = [
	// airbus
	"A319", "A320", "A321", "A333", "A338", "A339", "A359", "A35K", "A388", "BCS1", "BCS2",
	// boeing
	"B37M","B38M","B39M","B712","B737","B738","B739","B744","B748","B752","B753","B762","B763","B764","B772","B773","B77L","B77W","B788","B789","B78X",
	// bombardier
	"CRJ1", "CRJ2", "CRJ7", "CRJ9", "E135",
	// embraer
	"E145", "E170", "E195", "E290", "E295", "E45X", "E75L", "E75S"
] as const;

type QueryResponse = {
	plane: string;
	flights: number;
}

export const aircraft = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
		const records = await prisma.$queryRaw<QueryResponse[]>`
			SELECT 
				(flight->>'type') AS plane,
				COUNT(*)::int AS flights
			FROM airport_traffic_record,
			LATERAL jsonb_array_elements(flights::jsonb) AS flight
			WHERE 1=1
				AND (flight->>'type') IN (${Prisma.join(CommonPaxAircraft)})
				AND day = ${marker.day}
				AND month = ${marker.month}
				AND year = ${marker.year}
			GROUP BY plane
			ORDER BY flights DESC
		`;
		
		const tracked = new Set<string>();
		const datum = {} as Record<string, number>;
		let cumulative = 0;
		
		for (const { plane, flights } of records) {
			if (!tracked.has(plane)) tracked.add(plane);
			datum[plane] = flights;
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
