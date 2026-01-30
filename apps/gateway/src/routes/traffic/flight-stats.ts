import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { redis } from "@/services/redis";

export const flightStats = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
		const where = {
			year: { equals: marker.year },
			month: { equals: marker.month },
			day: { equals: marker.day }
		};
		
		const delayed = await redis
			.get("__airspace:delays")
			.then(delays => {
				if (!delays) return 0;
				return parseInt(delays) || 0;
			})
			.catch(() => 0);
		
		const stats = await prisma
			.airportTrafficFlow
			.aggregate({
				where,
				_sum: {
					total_flights: true,
					cancelled_flights: true
				}
			})
			.then(({ _sum: { total_flights, cancelled_flights } }) => ({
				total: total_flights ?? 0,
				cancelled: cancelled_flights ?? 0
			}))
			.then(({ total, cancelled }) => ({
				total, cancelled, delayed,
				normal: total - delayed - cancelled,
			}));
		
		const { busiest, mostCancelled } = await prisma
			.$transaction([
				prisma.airportTrafficFlow.findMany({
					where,
					select: { iata_code: true, total_flights: true },
					orderBy: { total_flights: "desc" },
					take: 5
				}),
				prisma.airportTrafficFlow.findMany({
					where,
					select: { iata_code: true, cancelled_flights: true },
					orderBy: { cancelled_flights: "desc" },
					take: 5
				})
			])
			.then(([busiest, mostCancelled]) => ({ busiest, mostCancelled }));
		
		return { stats, busiest, mostCancelled };
	})