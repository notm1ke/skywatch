import { z } from "zod/v4";
import { AirspaceType } from "@/schemas";
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
		message: "There isn't any traffic data yet"
	});
	
	return next({ context: { marker } })
});
