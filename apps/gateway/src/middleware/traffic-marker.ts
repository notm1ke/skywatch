import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";

type TrafficDataMarker = {
	year: number;
	month: number;
	day: number;
}

export const injectDataMarker = base.middleware<
	{ marker: TrafficDataMarker },
	unknown, unknown
>(async ({ next }) => {
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
