import moment from "moment-timezone";

import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";

export const airportTrafficInput = z.object({
	airport: z.string().length(3).toUpperCase(),
	/** Zulu day (YYYY-MM-DD). Defaults to the airport's latest day with data. */
	date: z.iso.date().optional()
});

export type Marker = { year: number; month: number; day: number };

const pad = (n: number) => n.toString().padStart(2, "0");

export const markerDate = (m: Marker) => `${m.year}-${pad(m.month)}-${pad(m.day)}`;

export const parseDate = (date: string): Marker => {
	const [year, month, day] = date.split("-").map(Number);
	return { year, month, day };
};

export const shiftDate = (m: Marker, days: number): Marker => {
	const d = new Date(Date.UTC(m.year, m.month - 1, m.day + days));
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

/** FAA bucket times are Zulu: the day runs [00:00Z, 24:00Z). */
export const zuluDayBounds = (m: Marker) => ({
	start: new Date(Date.UTC(m.year, m.month - 1, m.day)),
	end: new Date(Date.UTC(m.year, m.month - 1, m.day + 1))
});

/** "1845" -> minutes since 00:00Z */
export const bucketMinutes = (time: string) => parseInt(time.slice(0, 2)) * 60 + parseInt(time.slice(2, 4));

/** The airport's IANA timezone, or null if it's missing / unknown to the tz database. */
export const airportTimezone = async (iata: string): Promise<string | null> => {
	const airport = await prisma.airport.findUnique({
		where: { iata_code: iata },
		select: { timezone: true }
	});

	if (!airport) throw new ORPCError("NOT_FOUND", { message: "Airport not found" });
	return airport.timezone && moment.tz.zone(airport.timezone) ? airport.timezone : null;
};

export type AarSource =
	/** AAR the FAA published for each bucket, recorded at ingest. */
	| "recorded"
	/** Pre-recording day whose stored rate array was a single value; drawn flat (approximate). */
	| "approximate"
	/** Pre-recording day with a stepped array we can't place on the time axis: flat default AAR. */
	| "default";

export type DemandBucket = {
	time: string;
	onTime: number;
	delayed: number;
	irregular: number;
	total: number;
	aar: number | null;
};

type DemandRow = {
	time: string;
	aar: number | null;
	on_time: number;
	delayed: number;
	irregular: number;
};

/**
 * Per-bucket arrivals split by status, with each bucket's AAR resolved:
 * recorded value when we have it, otherwise a flat fallback (see `AarSource`).
 *
 * Arrivals per bucket = the sum of the STATUS counts, matching the airspace status chart.
 * Grouping: on time = Arrived + Departing + Flight Active, delayed = Past Dept Time + EDCT Issued.
 */
export const loadDemand = async (iata: string, marker: Marker) => {
	const [rows, flow] = await Promise.all([
		prisma.$queryRaw<DemandRow[]>`
			SELECT
				r.time,
				r.aar,
				COALESCE(SUM((e->>'count')::int) FILTER (WHERE e->>'name' IN ('Arrived', 'Departing', 'Flight Active')), 0)::int AS on_time,
				COALESCE(SUM((e->>'count')::int) FILTER (WHERE e->>'name' IN ('Past Dept Time', 'EDCT Issued')), 0)::int AS delayed,
				COALESCE(SUM((e->>'count')::int) FILTER (WHERE e->>'name' = 'Irregular'), 0)::int AS irregular
			FROM airport_traffic_record r
			LEFT JOIN LATERAL jsonb_array_elements(r.counts::jsonb) e ON e->>'type' = 'STATUS'
			WHERE r.iata_code = ${iata}
				AND r.year = ${marker.year}
				AND r.month = ${marker.month}
				AND r.day = ${marker.day}
			GROUP BY r.time, r.aar
			ORDER BY r.time
		`,
		prisma.airportTrafficFlow.findUnique({
			where: { iata_code_year_month_day: { iata_code: iata, ...marker } },
			select: { total_flights: true, cancelled_flights: true, default_arrival_rate: true, arrival_rates: true }
		})
	]);

	if (!flow) throw new ORPCError("NO_DATA_ERROR", { message: "There isn't any traffic data for that day" });

	let source: AarSource = "recorded";
	let fallback: number | null = null;
	if (!rows.some(row => row.aar != null)) {
		const rates = flow.arrival_rates;
		if (rates.length > 0 && rates.every(rate => rate === rates[0])) {
			source = "approximate";
			fallback = rates[0];
		} else {
			source = "default";
			fallback = flow.default_arrival_rate;
		}
	}

	const buckets: DemandBucket[] = rows.map(row => ({
		time: row.time,
		onTime: row.on_time,
		delayed: row.delayed,
		irregular: row.irregular,
		total: row.on_time + row.delayed + row.irregular,
		aar: row.aar ?? fallback
	}));

	return { buckets, source, flow };
};
