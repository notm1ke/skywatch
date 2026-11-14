import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { cache } from "@/middleware/cache";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { airportTrafficInput, loadDemand, markerDate, zuluDayBounds } from "./common";

const AirportDemandOutput = z.object({
	airport: z.string(),
	date: z.string(),
	aarSource: z.enum(["recorded", "approximate", "default"]),
	buckets: z.array(z.object({
		time: z.string(),
		onTime: z.number(),
		delayed: z.number(),
		irregular: z.number(),
		total: z.number(),
		aar: z.number().nullable()
	})),
	/** Ground stops, delays and closures overlapping the Zulu day. Times are when Skywatch first saw / last saw the program. */
	programs: z.array(z.object({
		type: z.string(),
		firstSeen: z.string(),
		resolvedAt: z.string().nullable()
	}))
});

export const demand = base
	.input(airportTrafficInput)
	.use(cache(
		input => `traffic:airport:demand:${input.airport}:${input.date ?? "latest"}`,
		"1 minutes",
		AirportDemandOutput
	))
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input: { airport } }) => {
		const { start, end } = zuluDayBounds(marker);
		const [{ buckets, source }, programs] = await Promise.all([
			loadDemand(airport, marker),
			prisma.airportStatusHistory.findMany({
				where: {
					airport_iata: airport,
					observed_at: { lt: end },
					OR: [{ resolved_at: null }, { resolved_at: { gt: start } }]
				},
				orderBy: { observed_at: "asc" },
				select: { event_type: true, observed_at: true, resolved_at: true }
			})
		]);

		return {
			airport,
			date: markerDate(marker),
			aarSource: source,
			buckets,
			programs: programs.map(program => ({
				type: program.event_type,
				firstSeen: program.observed_at.toISOString(),
				resolvedAt: program.resolved_at?.toISOString() ?? null
			}))
		};
	});
