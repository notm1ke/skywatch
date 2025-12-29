import { z } from "zod/v4";
import { base } from "~/utils";
import { prisma } from "~/services/prisma";
import { injectDataMarker, TrafficFlow } from ".";

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

export const aircraft = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
		const records = await prisma.airportTrafficFlowRecord.findMany({
			where: marker,
			select: {
				time: true,
				flights: true
			}
		});
		
		const tracked = new Set<CommonPaxAircraftType>();
		const dataPoints = records.reduce((acc, bucket) => {
			const { flights } = bucket;
			for (const flight of flights) {
				const type = flight.type as CommonPaxAircraftType;
				if (!CommonPaxAircraft.includes(type)) continue;
				if (!tracked.has(type)) tracked.add(type);
				acc[type] = (acc[type] || 0) + 1;
			}
			
			return acc;
		}, {} as Record<CommonPaxAircraftType, number>);
		
		// d3 treechart, not recharts, so this is a non-standard response
		const flow: TrafficFlow<string> = {
			config: {},
			dataKeys: Array.from(tracked),
			data: [
				{
					time: "",
					datum: dataPoints,
					cumulative: Object.values(dataPoints).reduce((acc, val) => acc + val, 0)
				}
			]
		}
		
		return flow;
	})