import { z } from "zod/v4";
import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { cache } from "@/middleware/cache";
import { prisma } from "@/services/prisma";
import { CancellationStats } from "@/schemas/faa";

export const cancellations = base
	.input(z.void())
	.use(cache(
		"__airspace:cancellations",
		"1 minutes",
		CancellationStats
	))
	.handler(async () => {
		const marker = await prisma
			.airportTrafficFlow
			.findFirst({
				orderBy: [
					{ year: 'desc' },
					{ month: 'desc' },
					{ day: 'desc' }
				],
				select: {
					year: true,
					month: true,
					day: true
				}
			});

		if (!marker || !marker?.day || !marker?.month || !marker?.year) {
			throw new ORPCError("NO_DATA_ERROR", {
				message: "No data available for cancellations"
			});
		}

		return await prisma
			.airportTrafficFlow
			.aggregate({
				where: {
					year: { equals: marker.year },
					month: { equals: marker.month },
					day: { equals: marker.day }
				},
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
				total,
				cancelled,
				interrupted: cancelled / total
			}));
	});
