import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { cache } from "@/middleware/cache";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { airportTrafficInput, markerDate } from "./common";

const AirportMixOutput = z.object({
	airport: z.string(),
	date: z.string(),
	/** Arrivals with a known origin in our stored buckets; denominator for shares. */
	listedArrivals: z.number(),
	origins: z.array(z.object({
		origin: z.string(),
		flights: z.number(),
		/** Average ETD -> ETA in minutes, or null if no flight had parseable times. */
		avgMinutes: z.number().nullable()
	})),
	stageLength: z.object({
		bands: z.array(z.object({ label: z.string(), flights: z.number() })),
		unknown: z.number(),
		avgMinutes: z.number().nullable()
	}),
	fixes: z.array(z.object({ name: z.string(), flights: z.number() }))
});

type FlightRow = { origin: string; dur: number | null };
type FixRow = { name: string; flights: number };

/**
 * Flight time = ETA - ETD, parsed from the FAA's `<prefix><day>/<HHMM>` strings (e.g. "A02/0405").
 * The feed's own `ete` can't be used: it's 0 for flights that have landed.
 * Modulo 31 days handles month rollover; implausible values (<10 min or >20 h) are dropped.
 */
const BANDS = [
	{ label: "<1h", max: 60 },
	{ label: "1–2h", max: 120 },
	{ label: "2–3h", max: 180 },
	{ label: "3–5h", max: 300 },
	{ label: "5h+", max: Infinity }
];

export const mix = base
	.input(airportTrafficInput)
	.use(cache(
		input => `traffic:airport:mix:${input.airport}:${input.date ?? "latest"}`,
		"1 minutes",
		AirportMixOutput
	))
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input: { airport } }) => {
		const [flights, fixes] = await Promise.all([
			prisma.$queryRaw<FlightRow[]>`
				SELECT origin, CASE WHEN dur BETWEEN 10 AND 1200 THEN dur END::int AS dur
				FROM (
					SELECT
						f->>'origin' AS origin,
						CASE
							WHEN f->>'etd' ~ '^[A-Z][0-9]{2}/[0-9]{4}$' AND f->>'eta' ~ '^[A-Z][0-9]{2}/[0-9]{4}$' THEN
								(
									(substr(f->>'eta', 2, 2)::int * 1440 + substr(f->>'eta', 5, 2)::int * 60 + substr(f->>'eta', 7, 2)::int)
									- (substr(f->>'etd', 2, 2)::int * 1440 + substr(f->>'etd', 5, 2)::int * 60 + substr(f->>'etd', 7, 2)::int)
									+ 44640
								) % 44640
						END AS dur
					FROM airport_traffic_record r,
					LATERAL jsonb_array_elements(r.flights::jsonb) f
					WHERE r.iata_code = ${airport}
						AND r.year = ${marker.year}
						AND r.month = ${marker.month}
						AND r.day = ${marker.day}
				) flights
				WHERE origin IS NOT NULL AND origin <> ''
			`,
			prisma.$queryRaw<FixRow[]>`
				SELECT e->>'name' AS name, SUM((e->>'count')::int)::int AS flights
				FROM airport_traffic_record r,
				LATERAL jsonb_array_elements(r.counts::jsonb) e
				WHERE r.iata_code = ${airport}
					AND r.year = ${marker.year}
					AND r.month = ${marker.month}
					AND r.day = ${marker.day}
					AND e->>'type' = 'FIX'
				GROUP BY 1
				HAVING SUM((e->>'count')::int) > 0
				ORDER BY 2 DESC
			`
		]);

		const byOrigin = new Map<string, { flights: number; minutes: number[] }>();
		const bandCounts = BANDS.map(() => 0);
		const known: number[] = [];
		let unknown = 0;

		for (const { origin, dur } of flights) {
			const entry = byOrigin.get(origin) ?? { flights: 0, minutes: [] };
			entry.flights++;
			byOrigin.set(origin, entry);

			if (dur == null) {
				unknown++;
				continue;
			}

			entry.minutes.push(dur);
			known.push(dur);
			bandCounts[BANDS.findIndex(band => dur < band.max)]++;
		}

		const avg = (values: number[]) => values.length
			? Math.round(values.reduce((acc, v) => acc + v, 0) / values.length)
			: null;

		return {
			airport,
			date: markerDate(marker),
			listedArrivals: flights.length,
			origins: [...byOrigin.entries()]
				.map(([origin, { flights, minutes }]) => ({ origin, flights, avgMinutes: avg(minutes) }))
				.sort((a, b) => b.flights - a.flights)
				.slice(0, 12),
			stageLength: {
				bands: BANDS.map((band, i) => ({ label: band.label, flights: bandCounts[i] })),
				unknown,
				avgMinutes: avg(known)
			},
			fixes: fixes.map(fix => ({ name: fix.name, flights: fix.flights }))
		};
	});
