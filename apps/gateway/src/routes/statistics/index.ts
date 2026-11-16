import { z } from "zod/v4";
import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";
import { cache } from "@/middleware/cache";
import { Marker, markerDate, shiftDate } from "../traffic/airport/common";

/**
 * Numbers for the statistics page, across the whole stored history rather than a single day. Everything here is cached
 * for a while: the data only grows by a few buckets every few minutes, and a few of these scan a lot of rows.
 */

const DAILY_DAYS = 90;
const HEATMAP_DAYS = 56;
const RECENT_DAYS = 30;
const MIX_DAYS = 7;
/** A day counts as complete once it has this share of the most buckets any day in the window has. */
const COMPLETE_RATIO = 0.85;

/** The most recent day we have traffic for. */
const latestDay = async (): Promise<Marker> => {
	const latest = await prisma.airportTrafficFlow.findFirst({
		orderBy: [{ year: "desc" }, { month: "desc" }, { day: "desc" }],
		select: { year: true, month: true, day: true }
	});

	if (!latest) throw new ORPCError("NO_DATA_ERROR", { message: "There's no traffic data yet" });
	return latest;
};

type DayRow = { year: number; month: number; day: number; total: number; cancelled: number };
type BucketRow = { year: number; month: number; day: number; buckets: number };

/** Every day in the window with its totals and whether the feed covered all of it. */
const dailyRows = async (from: Marker, to: Marker) => {
	const [totals, buckets] = await Promise.all([
		prisma.$queryRaw<DayRow[]>`
			SELECT t.year, t.month, t.day,
				SUM(t.total_flights)::int AS total,
				SUM(t.cancelled_flights)::int AS cancelled
			FROM airport_traffic t
			WHERE (t.year, t.month, t.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (t.year, t.month, t.day) <= (${to.year}, ${to.month}, ${to.day})
			GROUP BY t.year, t.month, t.day
			ORDER BY t.year, t.month, t.day
		`,
		prisma.$queryRaw<BucketRow[]>`
			SELECT r.year, r.month, r.day, COUNT(DISTINCT r.time)::int AS buckets
			FROM airport_traffic_record r
			WHERE (r.year, r.month, r.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (r.year, r.month, r.day) <= (${to.year}, ${to.month}, ${to.day})
			GROUP BY r.year, r.month, r.day
		`
	]);

	const byDate = new Map(buckets.map(row => [markerDate(row), row.buckets]));
	const most = Math.max(0, ...buckets.map(row => row.buckets));
	const threshold = Math.ceil(most * COMPLETE_RATIO);

	return totals.map(row => ({
		date: markerDate(row),
		total: row.total,
		cancelled: row.cancelled,
		complete: most > 0 && (byDate.get(markerDate(row)) ?? 0) >= threshold
	}));
};

// ---------------------------------------------------------------------------------------------
// Flights per day

const Daily = z.object({
	/** when these numbers were worked out: they're cached for a while, so this says how stale they could be */
	generatedAt: z.string(),
	/** the last day with data */
	date: z.string(),
	days: z.array(z.object({
		date: z.string(),
		total: z.number(),
		cancelled: z.number(),
		complete: z.boolean()
	})),
	/** over the complete days only: a day the feed only half covered would drag these down */
	summary: z.object({
		completeDays: z.number(),
		averagePerDay: z.number(),
		busiest: z.object({ date: z.string(), total: z.number() }).nullable(),
		quietest: z.object({ date: z.string(), total: z.number() }).nullable(),
		cancelled: z.number(),
		cancelRate: z.number()
	})
});

const daily = base
	.input(z.void())
	.use(cache("__statistics:daily", "1 hour", Daily))
	.handler(async () => {
		const latest = await latestDay();
		const days = await dailyRows(shiftDate(latest, -(DAILY_DAYS - 1)), latest);

		const complete = days.filter(day => day.complete);
		const flights = complete.reduce((sum, day) => sum + day.total, 0);
		const cancelled = complete.reduce((sum, day) => sum + day.cancelled, 0);
		const sorted = [...complete].sort((a, b) => b.total - a.total);

		return {
			generatedAt: new Date().toISOString(),
			date: markerDate(latest),
			days,
			summary: {
				completeDays: complete.length,
				averagePerDay: complete.length ? Math.round(flights / complete.length) : 0,
				busiest: sorted.length ? { date: sorted[0].date, total: sorted[0].total } : null,
				quietest: sorted.length ? { date: sorted[sorted.length - 1].date, total: sorted[sorted.length - 1].total } : null,
				cancelled,
				cancelRate: flights ? cancelled / flights : 0
			}
		};
	});

// ---------------------------------------------------------------------------------------------
// When the system is busy

const Heatmap = z.object({
	sampleDays: z.number(),
	/** `dow` is 0 = Sunday, `hour` is the airport's own clock; `avg` is arrivals per hour across every airport */
	cells: z.array(z.object({ dow: z.number(), hour: z.number(), avg: z.number(), samples: z.number() }))
});

type CellRow = { dow: number; hr: number; avg: number; samples: number };

const heatmap = base
	.input(z.void())
	.use(cache("__statistics:heatmap", "6 hours", Heatmap))
	.handler(async () => {
		const latest = await latestDay();
		const from = shiftDate(latest, -(HEATMAP_DAYS - 1));
		const days = await dailyRows(from, latest);
		const dates = days.filter(day => day.complete).map(day => day.date);

		if (!dates.length) return { sampleDays: 0, cells: [] };

		// Each airport's arrivals are put on its own clock (a 6pm rush is 6pm everywhere), averaged per weekday and hour,
		// and then added up across airports: "arrivals per hour across the system, as if the clock were the same
		// everywhere". Airports without a time zone we know are left out.
		const rows = await prisma.$queryRaw<CellRow[]>`
			WITH b AS (
				SELECT r.iata_code,
					(make_timestamp(r.year, r.month, r.day, substr(r.time, 1, 2)::int, substr(r.time, 3, 2)::int, 0) AT TIME ZONE 'UTC') AT TIME ZONE a.timezone AS lt,
					COALESCE((SELECT SUM((e->>'count')::int) FROM jsonb_array_elements(r.counts::jsonb) e WHERE e->>'type' = 'STATUS'), 0)::int AS n
				FROM airport_traffic_record r
				JOIN airports a ON a.iata_code = r.iata_code
				WHERE a.timezone IN (SELECT name FROM pg_timezone_names)
					AND (r.year, r.month, r.day) >= (${from.year}, ${from.month}, ${from.day})
					AND (r.year, r.month, r.day) <= (${latest.year}, ${latest.month}, ${latest.day})
					AND make_date(r.year, r.month, r.day) = ANY(${dates}::date[])
			),
			hours AS (SELECT iata_code, date_trunc('hour', lt) AS h, SUM(n)::int AS n FROM b GROUP BY 1, 2),
			cells AS (
				SELECT iata_code, EXTRACT(dow FROM h)::int AS dow, EXTRACT(hour FROM h)::int AS hr, AVG(n)::float AS avg, COUNT(*)::int AS samples
				FROM hours
				GROUP BY 1, 2, 3
			)
			SELECT dow, hr, SUM(avg)::float AS avg, ROUND(AVG(samples))::int AS samples
			FROM cells
			GROUP BY 1, 2
			ORDER BY 1, 2
		`;

		return {
			sampleDays: dates.length,
			cells: rows.map(row => ({
				dow: row.dow,
				hour: row.hr,
				avg: Math.round(row.avg),
				samples: row.samples
			}))
		};
	});

// ---------------------------------------------------------------------------------------------
// Cancellations, and which airports see the most

const Cancellations = z.object({
	days: z.number(),
	flights: z.number(),
	cancelled: z.number(),
	/** the airports that cancel the biggest share of their flights (busy enough for the share to mean something) */
	worst: z.array(z.object({
		iata: z.string(),
		name: z.string(),
		flights: z.number(),
		cancelled: z.number(),
		rate: z.number()
	}))
});

/** an airport needs this many flights in the window before its cancellation rate is worth ranking */
const MIN_FLIGHTS_TO_RANK = 3000;

type CancelRow = { iata_code: string; name: string; flights: number; cancelled: number };

const cancellations = base
	.input(z.void())
	.use(cache("__statistics:cancellations", "1 hour", Cancellations))
	.handler(async () => {
		const latest = await latestDay();
		const from = shiftDate(latest, -(RECENT_DAYS - 1));

		const rows = await prisma.$queryRaw<CancelRow[]>`
			SELECT t.iata_code, a.name,
				SUM(t.total_flights)::int AS flights,
				SUM(t.cancelled_flights)::int AS cancelled
			FROM airport_traffic t
			JOIN airports a ON a.iata_code = t.iata_code
			WHERE (t.year, t.month, t.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (t.year, t.month, t.day) <= (${latest.year}, ${latest.month}, ${latest.day})
			GROUP BY t.iata_code, a.name
		`;

		const flights = rows.reduce((sum, row) => sum + row.flights, 0);
		const cancelled = rows.reduce((sum, row) => sum + row.cancelled, 0);

		return {
			days: RECENT_DAYS,
			flights,
			cancelled,
			worst: rows
				.filter(row => row.flights >= MIN_FLIGHTS_TO_RANK && row.cancelled > 0)
				.map(row => ({
					iata: row.iata_code,
					name: row.name,
					flights: row.flights,
					cancelled: row.cancelled,
					rate: row.cancelled / row.flights
				}))
				.sort((a, b) => b.rate - a.rate)
				.slice(0, 8)
		};
	});

// ---------------------------------------------------------------------------------------------
// Which airlines and aircraft

const Mix = z.object({
	days: z.number(),
	/** every flight in the window, so the shares below are of all traffic, not just of what's ranked */
	flights: z.number(),
	airlines: z.array(z.object({
		/** ICAO code: "DAL" */
		code: z.string(),
		flights: z.number(),
		/** the airport it lands at most, "ATL" */
		topAirport: z.object({ iata: z.string(), flights: z.number() }).nullable()
	})),
	aircraft: z.array(z.object({
		/** ICAO type designator: "B738" */
		type: z.string(),
		flights: z.number()
	}))
});

type MixRow = { airline: string; destination: string; type: string; n: number };

const mix = base
	.input(z.void())
	.use(cache("__statistics:mix", "6 hours", Mix))
	.handler(async () => {
		const latest = await latestDay();
		const from = shiftDate(latest, -(MIX_DAYS - 1));

		const rows = await prisma.$queryRaw<MixRow[]>`
			SELECT
				COALESCE(flight->>'majorAirline', '') AS airline,
				COALESCE(flight->>'destination', '') AS destination,
				COALESCE(flight->>'type', '') AS type,
				COUNT(*)::int AS n
			FROM airport_traffic_record r,
			LATERAL jsonb_array_elements(r.flights::jsonb) AS flight
			WHERE (r.year, r.month, r.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (r.year, r.month, r.day) <= (${latest.year}, ${latest.month}, ${latest.day})
			GROUP BY 1, 2, 3
		`;

		let flights = 0;
		const airlines = new Map<string, { flights: number; airports: Map<string, number> }>();
		const aircraft = new Map<string, number>();

		for (const { airline, destination, type, n } of rows) {
			flights += n;
			if (type) aircraft.set(type, (aircraft.get(type) ?? 0) + n);
			if (!airline) continue;

			const entry = airlines.get(airline) ?? { flights: 0, airports: new Map() };
			entry.flights += n;
			if (destination) entry.airports.set(destination, (entry.airports.get(destination) ?? 0) + n);
			airlines.set(airline, entry);
		}

		return {
			days: MIX_DAYS,
			flights,
			airlines: [...airlines.entries()]
				.sort((a, b) => b[1].flights - a[1].flights)
				.slice(0, 10)
				.map(([code, entry]) => {
					const top = [...entry.airports.entries()].sort((a, b) => b[1] - a[1])[0];
					return {
						code,
						flights: entry.flights,
						topAirport: top ? { iata: top[0], flights: top[1] } : null
					};
				}),
			aircraft: [...aircraft.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10)
				.map(([type, count]) => ({ type, flights: count }))
		};
	});

// ---------------------------------------------------------------------------------------------
// Which centers handle the most

const Centers = z.object({
	days: z.number(),
	flights: z.number(),
	centers: z.array(z.object({ center: z.string(), flights: z.number(), airports: z.number() }))
});

type CenterRow = { artcc: string; flights: number; airports: number };

const centers = base
	.input(z.void())
	.use(cache("__statistics:centers", "1 hour", Centers))
	.handler(async () => {
		const latest = await latestDay();
		const from = shiftDate(latest, -(RECENT_DAYS - 1));

		const rows = await prisma.$queryRaw<CenterRow[]>`
			SELECT a.artcc, SUM(t.total_flights)::int AS flights, COUNT(DISTINCT t.iata_code)::int AS airports
			FROM airport_traffic t
			JOIN airports a ON a.iata_code = t.iata_code
			WHERE a.artcc IS NOT NULL AND a.artcc <> ''
				AND (t.year, t.month, t.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (t.year, t.month, t.day) <= (${latest.year}, ${latest.month}, ${latest.day})
			GROUP BY a.artcc
			ORDER BY flights DESC
		`;

		return {
			days: RECENT_DAYS,
			flights: rows.reduce((sum, row) => sum + row.flights, 0),
			centers: rows.slice(0, 10).map(row => ({ center: row.artcc, flights: row.flights, airports: row.airports }))
		};
	});

// ---------------------------------------------------------------------------------------------
// How busy each airport is: the size of its marker on the map

const Volume = z.object({
	days: z.number(),
	/** [iata, flights landing there over the window] */
	airports: z.array(z.tuple([z.string(), z.number()]))
});

type VolumeRow = { iata_code: string; flights: number };

const volume = base
	.input(z.void())
	.use(cache("__statistics:volume", "1 hour", Volume))
	.handler(async () => {
		const latest = await latestDay();
		const from = shiftDate(latest, -(RECENT_DAYS - 1));

		const rows = await prisma.$queryRaw<VolumeRow[]>`
			SELECT t.iata_code, SUM(t.total_flights)::int AS flights
			FROM airport_traffic t
			WHERE (t.year, t.month, t.day) >= (${from.year}, ${from.month}, ${from.day})
				AND (t.year, t.month, t.day) <= (${latest.year}, ${latest.month}, ${latest.day})
			GROUP BY t.iata_code
			ORDER BY flights DESC
		`;

		return {
			days: RECENT_DAYS,
			airports: rows.map(row => [row.iata_code, row.flights] as [string, number])
		};
	});

// ---------------------------------------------------------------------------------------------
// When and where flights get stopped or slowed

const DISRUPTION_DAYS = 90;
/** a ground stop that lasts longer than this is an entry the FAA never closed out, not a real stop */
const STALE_STOP_HOURS = 48;

const DisruptionKinds = ["closure", "ground_stop", "ground_delay", "delay"] as const;
type DisruptionKind = typeof DisruptionKinds[number];

const Disruptions = z.object({
	generatedAt: z.string(),
	days: z.array(z.object({
		date: z.string(),
		/** how many of each began that (Zulu) day */
		closure: z.number(),
		ground_stop: z.number(),
		ground_delay: z.number(),
		delay: z.number()
	})),
	totals: z.object({
		closure: z.number(),
		ground_stop: z.number(),
		ground_delay: z.number(),
		delay: z.number()
	}),
	/** ground stops that ended, in hours; entries the FAA left open for days are left out */
	stops: z.object({
		count: z.number(),
		averageHours: z.number(),
		airports: z.array(z.object({
			iata: z.string(),
			name: z.string(),
			count: z.number(),
			hours: z.number()
		}))
	})
});

type EventRow = { day: Date; event_type: string; n: number };
type StopRow = { airport_iata: string; name: string; stops: number; hours: number };

/** the delay types are one kind to anyone looking at the page */
const kindOf = (eventType: string): DisruptionKind | null => {
	switch (eventType) {
		case "airport_closure": return "closure";
		case "ground_stop": return "ground_stop";
		case "ground_delay": return "ground_delay";
		case "departure_delay":
		case "arrival_delay":
		case "dual_delay": return "delay";
		default: return null;
	}
};

const disruptions = base
	.input(z.void())
	.use(cache("__statistics:disruptions", "30 minutes", Disruptions))
	.handler(async () => {
		const today = new Date();
		const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (DISRUPTION_DAYS - 1)));

		const [events, stops] = await Promise.all([
			prisma.$queryRaw<EventRow[]>`
				SELECT (h.observed_at AT TIME ZONE 'UTC')::date AS day, h.event_type::text AS event_type, COUNT(*)::int AS n
				FROM airport_status_history h
				WHERE h.observed_at >= ${start}
				GROUP BY 1, 2
			`,
			prisma.$queryRaw<StopRow[]>`
				SELECT h.airport_iata, a.name,
					COUNT(*)::int AS stops,
					SUM(EXTRACT(EPOCH FROM (h.resolved_at - h.observed_at)) / 3600)::float AS hours
				FROM airport_status_history h
				JOIN airports a ON a.iata_code = h.airport_iata
				WHERE h.event_type = 'ground_stop'
					AND h.resolved_at IS NOT NULL
					AND h.observed_at >= ${start}
					AND h.resolved_at - h.observed_at <= make_interval(hours => ${STALE_STOP_HOURS})
				GROUP BY h.airport_iata, a.name
				ORDER BY hours DESC
			`
		]);

		const byDate = new Map<string, Record<DisruptionKind, number>>();
		for (let i = 0; i < DISRUPTION_DAYS; i++) {
			const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
			byDate.set(date, { closure: 0, ground_stop: 0, ground_delay: 0, delay: 0 });
		}

		const totals: Record<DisruptionKind, number> = { closure: 0, ground_stop: 0, ground_delay: 0, delay: 0 };
		for (const event of events) {
			const kind = kindOf(event.event_type);
			const day = byDate.get(new Date(event.day).toISOString().slice(0, 10));
			if (!kind || !day) continue;
			day[kind] += event.n;
			totals[kind] += event.n;
		}

		const count = stops.reduce((sum, row) => sum + row.stops, 0);
		const hours = stops.reduce((sum, row) => sum + row.hours, 0);

		return {
			generatedAt: new Date().toISOString(),
			days: [...byDate.entries()].map(([date, kinds]) => ({ date, ...kinds })),
			totals,
			stops: {
				count,
				averageHours: count ? Math.round((hours / count) * 10) / 10 : 0,
				airports: stops.slice(0, 8).map(row => ({
					iata: row.airport_iata,
					name: row.name,
					count: row.stops,
					hours: Math.round(row.hours)
				}))
			}
		};
	});

// ---------------------------------------------------------------------------------------------
// Through the seasons: every week since the feed's history begins

const Seasons = z.object({
	/** the first day anything was recorded: the first week starts before it, so it's partial */
	since: z.string(),
	weeks: z.array(z.object({
		/** the Monday that week starts on (Zulu) */
		week: z.string(),
		closure: z.number(),
		ground_stop: z.number(),
		ground_delay: z.number(),
		delay: z.number(),
		/** the week the history starts in, or the one still going */
		partial: z.boolean()
	})),
	months: z.array(z.object({
		/** "2026-07" */
		month: z.string(),
		closure: z.number(),
		ground_stop: z.number(),
		ground_delay: z.number(),
		delay: z.number(),
		partial: z.boolean()
	}))
});

type PeriodRow = { period: Date; event_type: string; n: number };

const emptyKinds = (): Record<DisruptionKind, number> => ({ closure: 0, ground_stop: 0, ground_delay: 0, delay: 0 });
const day = (date: Date) => date.toISOString().slice(0, 10);

const seasons = base
	.input(z.void())
	.use(cache("__statistics:seasons", "1 hour", Seasons))
	.handler(async () => {
		const [weekRows, monthRows, first] = await Promise.all([
			prisma.$queryRaw<PeriodRow[]>`
				SELECT date_trunc('week', h.observed_at AT TIME ZONE 'UTC')::date AS period, h.event_type::text AS event_type, COUNT(*)::int AS n
				FROM airport_status_history h
				GROUP BY 1, 2
			`,
			prisma.$queryRaw<PeriodRow[]>`
				SELECT date_trunc('month', h.observed_at AT TIME ZONE 'UTC')::date AS period, h.event_type::text AS event_type, COUNT(*)::int AS n
				FROM airport_status_history h
				GROUP BY 1, 2
			`,
			prisma.airportStatusHistory.findFirst({ orderBy: { observed_at: "asc" }, select: { observed_at: true } })
		]);

		if (!first) return { since: "", weeks: [], months: [] };

		const since = first.observed_at;
		const now = new Date();

		const fold = (rows: PeriodRow[]) => {
			const periods = new Map<string, Record<DisruptionKind, number>>();
			for (const row of rows) {
				const kind = kindOf(row.event_type);
				if (!kind) continue;
				const key = day(new Date(row.period));
				const entry = periods.get(key) ?? emptyKinds();
				entry[kind] += row.n;
				periods.set(key, entry);
			}
			return periods;
		};

		// every week from the first to this one, so a quiet week is a zero rather than a hole
		const byWeek = fold(weekRows);
		const weeks: z.infer<typeof Seasons>["weeks"] = [];
		const firstMonday = new Date(`${[...byWeek.keys()].sort()[0]}T00:00:00Z`);

		for (let start = firstMonday; start <= now; start = new Date(start.getTime() + 7 * 86400000)) {
			const end = new Date(start.getTime() + 7 * 86400000);
			weeks.push({
				week: day(start),
				...(byWeek.get(day(start)) ?? emptyKinds()),
				partial: start < new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate())) || end > now
			});
		}

		const months = [...fold(monthRows).entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([start, kinds]) => {
				const from = new Date(`${start}T00:00:00Z`);
				const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
				return {
					month: start.slice(0, 7),
					...kinds,
					partial: from < since || to > now
				};
			});

		return { since: day(since), weeks, months };
	});

// ---------------------------------------------------------------------------------------------
// How long trouble lasts

const Durations = z.object({
	/** when the events it's over began: the whole history, for more of them */
	since: z.string(),
	kinds: z.array(z.object({
		kind: z.enum(DisruptionKinds),
		count: z.number(),
		/** hours */
		median: z.number(),
		p90: z.number()
	}))
});

type DurationRow = { kind: string; n: number; median: number; p90: number };

const durations = base
	.input(z.void())
	.use(cache("__statistics:durations", "6 hours", Durations))
	.handler(async () => {
		// entries the FAA never closed (more than three days) are mistakes in the feed, not long events
		const rows = await prisma.$queryRaw<DurationRow[]>`
			SELECT CASE h.event_type::text
					WHEN 'airport_closure' THEN 'closure'
					WHEN 'ground_stop' THEN 'ground_stop'
					WHEN 'ground_delay' THEN 'ground_delay'
					ELSE 'delay'
				END AS kind,
				COUNT(*)::int AS n,
				(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (h.resolved_at - h.observed_at)) / 3600))::float AS median,
				(percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (h.resolved_at - h.observed_at)) / 3600))::float AS p90
			FROM airport_status_history h
			WHERE h.resolved_at IS NOT NULL
				AND h.resolved_at - h.observed_at <= interval '72 hours'
			GROUP BY 1
		`;

		const first = await prisma.airportStatusHistory.findFirst({ orderBy: { observed_at: "asc" }, select: { observed_at: true } });
		const byKind = new Map(rows.map(row => [row.kind, row]));

		return {
			since: first ? day(first.observed_at) : "",
			kinds: DisruptionKinds.flatMap(kind => {
				const row = byKind.get(kind);
				return row ? [{ kind, count: row.n, median: Math.round(row.median * 10) / 10, p90: Math.round(row.p90 * 10) / 10 }] : [];
			})
		};
	});

// ---------------------------------------------------------------------------------------------
// A report card: which airports had trouble on which days

const RELIABILITY_AIRPORTS = 14;
/** an event that lasts longer than this is painted on its first day only: it's a stale entry, not three weeks of trouble */
const RELIABILITY_SPAN_HOURS = 72;

/**
 * One character a day, worst thing that happened that day: `.` nothing, `d` delays, `g` ground delay, `s` ground stop,
 * `c` closed. An event paints every day it covers, not just the one it began on.
 */
const Reliability = z.object({
	days: z.array(z.string()),
	/** airports we have traffic for: the ones that could have shown up here */
	tracked: z.number(),
	/** of those, how many had nothing at all, and how many no ground stop or closure */
	clean: z.number(),
	noStops: z.number(),
	airports: z.array(z.object({
		iata: z.string(),
		name: z.string(),
		/** days with anything */
		affected: z.number(),
		cells: z.string()
	}))
});

type EventSpan = { airport_iata: string; event_type: string; observed_at: Date; resolved_at: Date | null };

const RANK: Record<string, number> = { ".": 0, d: 1, g: 2, s: 3, c: 4 };
const CODE: Record<DisruptionKind, string> = { delay: "d", ground_delay: "g", ground_stop: "s", closure: "c" };

const reliability = base
	.input(z.void())
	.use(cache("__statistics:reliability", "30 minutes", Reliability))
	.handler(async () => {
		const today = new Date();
		const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (DISRUPTION_DAYS - 1)));
		const dayMs = 86400000;
		const days = Array.from({ length: DISRUPTION_DAYS }, (_, index) => day(new Date(start.getTime() + index * dayMs)));

		const latest = await latestDay();
		const from = shiftDate(latest, -(DISRUPTION_DAYS - 1));

		const [events, tracked, names] = await Promise.all([
			prisma.$queryRaw<EventSpan[]>`
				SELECT h.airport_iata, h.event_type::text AS event_type, h.observed_at, h.resolved_at
				FROM airport_status_history h
				WHERE COALESCE(h.resolved_at, now()) >= ${start}
			`,
			prisma.$queryRaw<Array<{ iata_code: string }>>`
				SELECT DISTINCT iata_code FROM airport_traffic
				WHERE (year, month, day) >= (${from.year}, ${from.month}, ${from.day})
			`,
			prisma.airport.findMany({ select: { iata_code: true, name: true } })
		]);

		const trackedSet = new Set(tracked.map(row => row.iata_code));
		const nameOf = new Map(names.map(airport => [airport.iata_code, airport.name]));
		const grid = new Map<string, string[]>();

		for (const event of events) {
			if (!trackedSet.has(event.airport_iata)) continue;
			const kind = kindOf(event.event_type);
			if (!kind) continue;

			const began = event.observed_at.getTime();
			const ended = (event.resolved_at ?? today).getTime();
			// a stale entry is painted on the day it began, not on every day since
			const last = ended - began > RELIABILITY_SPAN_HOURS * 3600000 ? began : Math.min(ended, today.getTime());

			const cells = grid.get(event.airport_iata) ?? Array.from({ length: DISRUPTION_DAYS }, () => ".");
			const firstIndex = Math.floor((Date.UTC(new Date(began).getUTCFullYear(), new Date(began).getUTCMonth(), new Date(began).getUTCDate()) - start.getTime()) / dayMs);
			const lastIndex = Math.floor((Date.UTC(new Date(last).getUTCFullYear(), new Date(last).getUTCMonth(), new Date(last).getUTCDate()) - start.getTime()) / dayMs);

			for (let index = Math.max(0, firstIndex); index <= Math.min(DISRUPTION_DAYS - 1, lastIndex); index++) {
				if (RANK[CODE[kind]] > RANK[cells[index]]) cells[index] = CODE[kind];
			}

			grid.set(event.airport_iata, cells);
		}

		const rows = [...grid.entries()].map(([iata, cells]) => ({
			iata,
			name: nameOf.get(iata) ?? iata,
			affected: cells.filter(cell => cell !== ".").length,
			cells: cells.join(""),
			stopped: cells.some(cell => cell === "s" || cell === "c")
		}));

		return {
			days,
			tracked: trackedSet.size,
			clean: trackedSet.size - rows.length,
			noStops: trackedSet.size - rows.filter(row => row.stopped).length,
			airports: rows
				.sort((a, b) => b.affected - a.affected)
				.slice(0, RELIABILITY_AIRPORTS)
				.map(({ stopped: _stopped, ...row }) => row)
		};
	});

// ---------------------------------------------------------------------------------------------
// The busiest routes between airports

const CORRIDOR_LIMIT = 40;

const Corridors = z.object({
	days: z.number(),
	/** every flight in the window, so a corridor's share is of all traffic */
	flights: z.number(),
	/** [airport, airport, flights in both directions], busiest first */
	pairs: z.array(z.tuple([z.string(), z.string(), z.number()]))
});

type PairRow = { origin: string; destination: string; n: number };

const corridors = base
	.input(z.void())
	.use(cache("__statistics:corridors", "6 hours", Corridors))
	.handler(async () => {
		const latest = await latestDay();
		const from = shiftDate(latest, -(MIX_DAYS - 1));

		// the airport a flight lands at is the one its record belongs to; where it left from is on the flight
		const [rows, known] = await Promise.all([
			prisma.$queryRaw<PairRow[]>`
				SELECT COALESCE(flight->>'origin', '') AS origin, r.iata_code AS destination, COUNT(*)::int AS n
				FROM airport_traffic_record r,
				LATERAL jsonb_array_elements(r.flights::jsonb) AS flight
				WHERE (r.year, r.month, r.day) >= (${from.year}, ${from.month}, ${from.day})
					AND (r.year, r.month, r.day) <= (${latest.year}, ${latest.month}, ${latest.day})
				GROUP BY 1, 2
			`,
			prisma.airport.findMany({ select: { iata_code: true } })
		]);

		// A to B and B to A are one corridor. Only airports we have a position for can be drawn.
		const airports = new Set(known.map(airport => airport.iata_code));
		const pairs = new Map<string, [string, string, number]>();
		let flights = 0;

		for (const { origin, destination, n } of rows) {
			flights += n;
			if (!origin || origin === destination || !airports.has(origin) || !airports.has(destination)) continue;

			const [a, b] = origin < destination ? [origin, destination] : [destination, origin];
			const entry = pairs.get(`${a}-${b}`) ?? [a, b, 0];
			entry[2] += n;
			pairs.set(`${a}-${b}`, entry);
		}

		return {
			days: MIX_DAYS,
			flights,
			pairs: [...pairs.values()].sort((a, b) => b[2] - a[2]).slice(0, CORRIDOR_LIMIT)
		};
	});

// ---------------------------------------------------------------------------------------------
// What's in the database

const AIRPORT_KINDS: readonly string[] = ["large_airport", "medium_airport", "small_airport"];

/** 0 large, 1 medium, 2 small, 3 anything else */
const sizeOf = (type: string) => {
	const index = AIRPORT_KINDS.indexOf(type);
	return index === -1 ? 3 : index;
};

const Reference = z.object({
	counts: z.object({
		airports: z.number(),
		runways: z.number(),
		frequencies: z.number(),
		navaids: z.number(),
		waypoints: z.number(),
		airways: z.number(),
		routes: z.number()
	}),
	/** every airport we have, as [longitude, latitude, size]: 0 large, 1 medium, 2 small, 3 anything else (a seaplane base, a heliport) */
	airports: z.array(z.tuple([z.number(), z.number(), z.number()]))
});

const reference = base
	.input(z.void())
	.use(cache("__statistics:reference", "6 hours", Reference))
	.handler(async () => {
		const [airports, runways, frequencies, navaids, waypoints, airways, routes, positions] = await Promise.all([
			prisma.airport.count(),
			prisma.airportRunway.count(),
			prisma.airportFrequency.count(),
			prisma.airportNav.count(),
			prisma.waypoint.count(),
			prisma.airway.count(),
			prisma.preferredRoute.count(),
			prisma.airport.findMany({ select: { type: true, latitude_deg: true, longitude_deg: true } })
		]);

		return {
			counts: { airports, runways, frequencies, navaids, waypoints, airways, routes },
			// three decimals is about 100 metres: more than a map of the country can show
			airports: positions.map(airport => [
				Math.round(airport.longitude_deg * 1e3) / 1e3,
				Math.round(airport.latitude_deg * 1e3) / 1e3,
				sizeOf(airport.type)
			] as [number, number, number])
		};
	});

// ---------------------------------------------------------------------------------------------
// The aircraft registry

/** a build year before this is a typo in the registry (it has years like 0000) */
const FIRST_YEAR = 1920;

const RegistryKinds = ["single", "jet", "multi", "helicopter", "electric", "balloon", "glider", "other"] as const;

const Registry = z.object({
	generatedAt: z.string(),
	/** registrations that are currently valid */
	total: z.number(),
	/** valid registrations with no usable build year: they aren't in `years` */
	unknownYear: z.number(),
	/** [year built, how many of those are registered now] */
	years: z.array(z.tuple([z.number(), z.number()])),
	builders: z.array(z.object({ name: z.string(), count: z.number() })),
	kinds: z.array(z.object({ kind: z.enum(RegistryKinds), count: z.number() })),
	states: z.array(z.tuple([z.string(), z.number()]))
});

type YearRow = { year: number; n: number };
type BuilderRow = { manufacturer: string; n: number };
type KindRow = { kind: string; n: number };
type StateRow = { owner_state: string; n: number };

const registry = base
	.input(z.void())
	.use(cache("__statistics:registry", "24 hours", Registry))
	.handler(async () => {
		const thisYear = new Date().getUTCFullYear();

		const [totals, years, builders, kinds, states] = await Promise.all([
			prisma.$queryRaw<Array<{ total: number; unknown: number }>>`
				SELECT COUNT(*)::int AS total,
					COUNT(*) FILTER (WHERE mfg_year IS NULL OR mfg_year !~ '^[0-9]{4}$' OR mfg_year::int < ${FIRST_YEAR} OR mfg_year::int > ${thisYear})::int AS unknown
				FROM plane_registrations
				WHERE status = 'V'
			`,
			prisma.$queryRaw<YearRow[]>`
				SELECT mfg_year::int AS year, COUNT(*)::int AS n
				FROM plane_registrations
				WHERE status = 'V' AND mfg_year ~ '^[0-9]{4}$' AND mfg_year::int BETWEEN ${FIRST_YEAR} AND ${thisYear}
				GROUP BY 1
				ORDER BY 1
			`,
			prisma.$queryRaw<BuilderRow[]>`
				SELECT a.manufacturer, COUNT(*)::int AS n
				FROM plane_registrations r
				JOIN aircraft a ON a.id = r.aircraft_id
				WHERE r.status = 'V'
				GROUP BY 1
				ORDER BY 2 DESC
				LIMIT 10
			`,
			prisma.$queryRaw<KindRow[]>`
				SELECT CASE
					WHEN aircraft_type = '4' THEN 'single'
					WHEN aircraft_type = '5' AND engine_type IN ('4', '5') THEN 'jet'
					WHEN aircraft_type = '5' THEN 'multi'
					WHEN aircraft_type = '6' AND engine_type = '10' THEN 'electric'
					WHEN aircraft_type = '6' THEN 'helicopter'
					WHEN aircraft_type = '2' THEN 'balloon'
					WHEN aircraft_type = '1' THEN 'glider'
					ELSE 'other'
				END AS kind, COUNT(*)::int AS n
				FROM plane_registrations
				WHERE status = 'V'
				GROUP BY 1
				ORDER BY 2 DESC
			`,
			prisma.$queryRaw<StateRow[]>`
				SELECT owner_state, COUNT(*)::int AS n
				FROM plane_registrations
				WHERE status = 'V' AND owner_state ~ '^[A-Z]{2}$'
				GROUP BY 1
				ORDER BY 2 DESC
				LIMIT 10
			`
		]);

		return {
			generatedAt: new Date().toISOString(),
			total: totals[0]?.total ?? 0,
			unknownYear: totals[0]?.unknown ?? 0,
			years: years.map(row => [row.year, row.n] as [number, number]),
			builders: builders.map(row => ({ name: row.manufacturer, count: row.n })),
			kinds: kinds.map(row => ({ kind: row.kind as typeof RegistryKinds[number], count: row.n })),
			states: states.map(row => [row.owner_state, row.n] as [string, number])
		};
	});

export const statisticsRouter = {
	statistics: { daily, heatmap, cancellations, mix, centers, volume, disruptions, seasons, durations, reliability, corridors, reference, registry }
};
