import { z } from "zod/v4";
import { base } from "@/utils";
import { TrafficFlow } from "@/schemas";
import { prisma } from "@/services/prisma";
import { injectDataMarker } from "@/middleware/traffic-marker";

export type CommonAirlineType = typeof CommonAirlines[number];

const CommonAirlines = [
	"AAL", "SWA", "DAL", "UAL", "FDX", "ASA", "JBU", "UPS", "NKS",
	"FFT", "AAY", "HAL", "BAW", "DLH", "UAE", "QTR", "ACA", "AFR",
	"KLM", "ANA", "THY", "CPA", "SIA", "EVA", "ETH"
] as const;

export const airline = base
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

		const tracked = new Set<CommonAirlineType>();
		const dataPoints = records.reduce((acc, bucket) => {
			const { flights } = bucket;
			for (const flight of flights) {
				const type = flight.majorAirline as CommonAirlineType;
				if (!CommonAirlines.includes(type)) continue;
				if (!tracked.has(type)) tracked.add(type);
				acc[type] = (acc[type] || 0) + 1;
			}

			return acc;
		}, {} as Record<CommonAirlineType, number>);

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

