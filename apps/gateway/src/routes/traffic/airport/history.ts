import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { cache } from "@/middleware/cache";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { airportTimezone, airportTrafficInput, Marker, markerDate, shiftDate } from "./common";

const WINDOW_DAYS = 60;
/** A day counts as complete once it has this share of the most buckets any day in the window has. */
const COMPLETE_RATIO = 0.85;

const AirportHistoryOutput = z.object({
	airport: z.string(),
	date: z.string(),
	timezone: z.string().nullable(),
	days: z.array(z.object({
		date: z.string(),
		total: z.number(),
		cancelled: z.number(),
		buckets: z.number(),
		complete: z.boolean()
	})),
	/** The selected day against the average of earlier complete days with the same Zulu weekday. */
	typical: z.object({
		/** ISO weekday of the selected Zulu day: 1 = Monday ... 7 = Sunday */
		isoWeekday: z.number(),
		sampleDays: z.number(),
		points: z.array(z.object({ time: z.string(), avg: z.number() }))
	}).nullable(),
	/** Average arrivals per local clock hour, by local weekday (0 = Sunday), over complete days. */
	heatmap: z.object({
		sampleDays: z.number(),
		cells: z.array(z.object({ dow: z.number(), hour: z.number(), avg: z.number(), samples: z.number() }))
	})
});

type DayRow = { year: number; month: number; day: number; total_flights: number; cancelled_flights: number; buckets: number };
type TypicalRow = { time: string; avg: number; samples: number };
type CellRow = { dow: number; hr: number; avg: number; samples: number };

const isoWeekday = ({ year, month, day }: Marker) => ((new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7) + 1;

export const history = base
	.input(airportTrafficInput)
	.use(cache(
		input => `traffic:airport:history:${input.airport}:${input.date ?? "latest"}`,
		"10 minutes",
		AirportHistoryOutput
	))
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input: { airport } }) => {
		const from = shiftDate(marker, -(WINDOW_DAYS - 1));
		const timezone = await airportTimezone(airport);
		const selected = markerDate(marker);

		// row comparison on (year, month, day) can use the unique index on (iata_code, year, month, day)
		const dayRows = await prisma.$queryRaw<DayRow[]>`
			SELECT t.year, t.month, t.day, t.total_flights, t.cancelled_flights,
				(SELECT COUNT(*) FROM airport_traffic_record r
					WHERE r.iata_code = t.iata_code AND r.year = t.year AND r.month = t.month AND r.day = t.day)::int AS buckets
			FROM airport_traffic t
			WHERE t.iata_code = ${airport}
				AND (t.year, t.month, t.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (t.year, t.month, t.day) <= (${marker.year}, ${marker.month}, ${marker.day})
			ORDER BY t.year, t.month, t.day
		`;

		const mostBuckets = Math.max(0, ...dayRows.map(row => row.buckets));
		const threshold = Math.ceil(mostBuckets * COMPLETE_RATIO);
		const days = dayRows.map(row => ({
			date: markerDate(row),
			total: row.total_flights,
			cancelled: row.cancelled_flights,
			buckets: row.buckets,
			complete: mostBuckets > 0 && row.buckets >= threshold
		}));

		const completeDates = days.filter(day => day.complete).map(day => day.date);
		const weekday = isoWeekday(marker);
		const sameWeekday = completeDates.filter(date => date !== selected && isoWeekday({
			year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10))
		}) === weekday);

		const [typicalRows, cellRows] = completeDates.length
			? await Promise.all([
				sameWeekday.length
					? prisma.$queryRaw<TypicalRow[]>`
						SELECT time, AVG(n)::float AS avg, COUNT(*)::int AS samples
						FROM (
							SELECT r.time,
								COALESCE((SELECT SUM((e->>'count')::int) FROM jsonb_array_elements(r.counts::jsonb) e WHERE e->>'type' = 'STATUS'), 0)::int AS n
							FROM airport_traffic_record r
							WHERE r.iata_code = ${airport}
								AND (r.year, r.month, r.day) >= (${from.year}, ${from.month}, ${from.day})
								AND (r.year, r.month, r.day) <= (${marker.year}, ${marker.month}, ${marker.day})
								AND make_date(r.year, r.month, r.day) = ANY(${sameWeekday}::date[])
						) b
						GROUP BY time
						ORDER BY time
					`
					: Promise.resolve([] as TypicalRow[]),
				prisma.$queryRaw<CellRow[]>`
					WITH b AS (
						SELECT
							(make_timestamp(r.year, r.month, r.day, substr(r.time, 1, 2)::int, substr(r.time, 3, 2)::int, 0) AT TIME ZONE 'UTC') AT TIME ZONE ${timezone ?? "UTC"} AS lt,
							COALESCE((SELECT SUM((e->>'count')::int) FROM jsonb_array_elements(r.counts::jsonb) e WHERE e->>'type' = 'STATUS'), 0)::int AS n
						FROM airport_traffic_record r
						WHERE r.iata_code = ${airport}
							AND (r.year, r.month, r.day) >= (${from.year}, ${from.month}, ${from.day})
							AND (r.year, r.month, r.day) <= (${marker.year}, ${marker.month}, ${marker.day})
							AND make_date(r.year, r.month, r.day) = ANY(${completeDates}::date[])
					),
					cells AS (SELECT date_trunc('hour', lt) AS h, SUM(n)::int AS n FROM b GROUP BY 1)
					SELECT EXTRACT(dow FROM h)::int AS dow, EXTRACT(hour FROM h)::int AS hr, AVG(n)::float AS avg, COUNT(*)::int AS samples
					FROM cells
					GROUP BY 1, 2
					ORDER BY 1, 2
				`
			])
			: [[] as TypicalRow[], [] as CellRow[]];

		return {
			airport,
			date: selected,
			timezone,
			days,
			typical: typicalRows.length
				? {
					isoWeekday: weekday,
					sampleDays: sameWeekday.length,
					points: typicalRows.map(row => ({ time: row.time, avg: Math.round(row.avg * 10) / 10 }))
				}
				: null,
			heatmap: {
				sampleDays: completeDates.length,
				cells: cellRows.map(row => ({
					dow: row.dow,
					hour: row.hr,
					avg: Math.round(row.avg * 10) / 10,
					samples: row.samples
				}))
			}
		};
	});
