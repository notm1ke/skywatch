import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";
import { airspaceInput, base } from "@/utils";
import { AirportTrafficFlowWhereInput } from "@/prisma/generated/models";

type TrafficDataMarker = {
	year: number;
	month: number;
	day: number;
}

export const injectDataMarker = base.middleware<
	{ marker: TrafficDataMarker },
	z.infer<typeof airspaceInput>, unknown
>(async ({ next }, input) => {
	const where: AirportTrafficFlowWhereInput = {};
	if (input.airspace) where.airport = { artcc: input.airspace };
	if (input.airport) where.iata_code = input.airport;
	if (input.date) {
		const [year, month, day] = input.date.split("-").map(Number);
		Object.assign(where, { year, month, day });
	}
	
	const marker = await prisma
		.airportTrafficFlow
		.findFirst({
			where,
			orderBy: [
				{ year: 'desc' },
				{ month: 'desc' },
				{ day: 'desc' }
			],
			select: {
				year: true,
				month: true,
				day: true
			},
		})
		.then(marker => {
			if (!marker || !marker.month || !marker.day) {
				return null;
			}

			return marker;
		})
		.catch(() => null);

	if (!marker) throw new ORPCError("NO_DATA_ERROR", {
		message: input.date
			? "There isn't any traffic data for that day"
			: "There isn't any traffic data yet"
	});
	
	return next({ context: { marker } })
});
