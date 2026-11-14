import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { cache } from "@/middleware/cache";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { airportTrafficInput, bucketMinutes, DemandBucket, loadDemand, markerDate } from "./common";

const AirportTrafficSummaryOutput = z.object({
	airport: z.string(),
	date: z.string(),
	generatedAt: z.string(),
	/** FAA's scheduled total for the day. Includes flights outside the buckets we hold, so it can exceed `listedArrivals`. */
	totalFlights: z.number(),
	cancelledFlights: z.number(),
	/** Arrivals actually present in our stored buckets. */
	listedArrivals: z.number(),
	bucketCount: z.number(),
	/** Most buckets any recent day has: the yardstick for "is this day partial?". */
	expectedBuckets: z.number(),
	defaultAar: z.number(),
	aar: z.object({
		source: z.enum(["recorded", "approximate", "default"]),
		min: z.number().nullable(),
		max: z.number().nullable()
	}),
	peakBucket: z.object({ time: z.string(), arrivals: z.number() }).nullable(),
	peakHour: z.object({
		/** Start of the busiest consecutive hour (4 buckets). */
		time: z.string(),
		arrivals: z.number(),
		aar: z.number().nullable()
	}).nullable(),
	/** Clock hours whose arrivals exceeded the AAR. Null when there's no AAR to compare with. */
	overCapacityHours: z.number().nullable(),
	hoursEvaluated: z.number(),
	availableDays: z.array(z.object({ date: z.string(), buckets: z.number() }))
});

const peakHour = (buckets: DemandBucket[]) => {
	let best: { time: string; arrivals: number; aar: number | null } | null = null;
	for (let i = 0; i + 3 < buckets.length; i++) {
		// only whole, gap-free hours
		if (bucketMinutes(buckets[i + 3].time) - bucketMinutes(buckets[i].time) !== 45) continue;
		const arrivals = buckets.slice(i, i + 4).reduce((acc, b) => acc + b.total, 0);
		if (!best || arrivals > best.arrivals) best = { time: buckets[i].time, arrivals, aar: buckets[i].aar };
	}
	return best;
};

const overCapacity = (buckets: DemandBucket[]) => {
	const byHour = Map.groupBy(buckets, b => b.time.slice(0, 2));
	let evaluated = 0;
	let over = 0;
	for (const hour of byHour.values()) {
		const aar = hour[0].aar;
		if (hour.length !== 4 || aar == null) continue;
		evaluated++;
		if (hour.reduce((acc, b) => acc + b.total, 0) > aar) over++;
	}

	return { over: evaluated ? over : null, evaluated };
};

type DayRow = { year: number; month: number; day: number; buckets: number };

export const summary = base
	.input(airportTrafficInput)
	.use(cache(
		input => `traffic:airport:summary:${input.airport}:${input.date ?? "latest"}`,
		"1 minutes",
		AirportTrafficSummaryOutput
	))
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input: { airport } }) => {
		const [{ buckets, source, flow }, days] = await Promise.all([
			loadDemand(airport, marker),
			prisma.$queryRaw<DayRow[]>`
				SELECT t.year, t.month, t.day,
					(SELECT COUNT(*) FROM airport_traffic_record r
						WHERE r.iata_code = t.iata_code AND r.year = t.year AND r.month = t.month AND r.day = t.day)::int AS buckets
				FROM airport_traffic t
				WHERE t.iata_code = ${airport}
				ORDER BY t.year DESC, t.month DESC, t.day DESC
				LIMIT 120
			`
		]);

		const aars = buckets.map(b => b.aar).filter((aar): aar is number => aar != null);
		const peak = buckets.reduce<DemandBucket | null>((best, b) => (!best || b.total > best.total ? b : best), null);
		const capacity = overCapacity(buckets);
		const availableDays = days
			.map(day => ({ date: markerDate(day), buckets: day.buckets }))
			.reverse();

		return {
			airport,
			date: markerDate(marker),
			generatedAt: new Date().toISOString(),
			totalFlights: flow.total_flights,
			cancelledFlights: flow.cancelled_flights,
			listedArrivals: buckets.reduce((acc, b) => acc + b.total, 0),
			bucketCount: buckets.length,
			expectedBuckets: Math.max(0, ...availableDays.map(day => day.buckets)),
			defaultAar: flow.default_arrival_rate,
			aar: {
				source,
				min: aars.length ? Math.min(...aars) : null,
				max: aars.length ? Math.max(...aars) : null
			},
			peakBucket: peak ? { time: peak.time, arrivals: peak.total } : null,
			peakHour: peakHour(buckets),
			overCapacityHours: capacity.over,
			hoursEvaluated: capacity.evaluated,
			availableDays
		};
	});
