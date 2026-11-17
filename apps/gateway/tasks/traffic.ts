import axios from "axios";
import moment from "moment-timezone";

import { Effect } from "effect";
import { defineTask } from "nitro/task";
import { AirportTrafficFlow, FlowMetricType } from "@/schemas";
import { prismaTasks as prisma } from "@/services/prisma-tasks";

const DEV_DISABLED = process.env.DEV_DISABLE_SCHEDULED_TASKS;

export type TrafficFlowResponse = {
	name: string; // IATA
	totalFlightCount: string; // int
	cancelledFlightCount: number;
	dateTime: string;
	month: string;
	day: string;
	year: string;
	defaultAarRate: string; // int
	control: string; // No GDP - ground delay protocol?
	rates: string[];
	fixes: string[]; // waypoints ?
	timeBuckets: Array<{
		day: string; // day of month, zero padded
		time: string; // time of day like 0800
		counts: Array<{
			type: FlowMetricType;
			name: string;
			count: number;
		}>;
		flights: Array<{
			acid: string; // callsign, i.e. UAL1609
			type: string; // IATA aircraft type, i.e. B739
			origin: string; // origin IATA
			destination: string; // destination IATA
			etd: string; // est. time of departure, i.e. A09/0422 (perhaps 11/9 at 0422?)
			ete: string; // est. time en-route (224 means 2h24m or 224m not sure)
			departureCenter: string; // origin airspace center, i.e. ZHU, ZOA
			majorAirline: string; // airline callsign, i.e. UAL
		}>;
	}>;
}

/**
 * The FAA payload carries one arrival rate (AAR, flights/hour) per hour of its rolling window, counted from
 * the window's first bucket, i.e. `rates[floor(bucketIndex / 4)]` for 15 minute buckets. (Observed: every
 * airport returns 64 buckets and 16 rates; ORD's overnight step-down lands on local midnight.)
 * The window start isn't persisted anywhere else, so it has to be resolved here, per bucket, at ingest.
 */
const BUCKETS_PER_RATE = 4;

const aarForBucket = (rates: string[], bucketIndex: number): number | null => {
	const aar = parseInt(rates[Math.floor(bucketIndex / BUCKETS_PER_RATE)]);
	return isNaN(aar) ? null : aar;
}

const sanitizeAndTransform = (flow: TrafficFlowResponse): AirportTrafficFlow => ({
	iata_code: flow.name,
	year: parseInt(flow.year),
	month: parseInt(flow.month),
	day: parseInt(flow.day),
	default_arrival_rate: parseInt(flow.defaultAarRate),
	arrival_rates: flow.rates.map(rate => parseInt(rate)),
	total_flights: parseInt(flow.totalFlightCount),
	cancelled_flights: flow.cancelledFlightCount,
	fixes: flow.fixes,
	time_buckets: flow
		.timeBuckets
		// resolve each bucket's AAR from its position in the *unfiltered* window, before dropping next-day buckets
		.map((bucket, index) => ({ bucket, aar: aarForBucket(flow.rates, index) }))
		// toward the end of the day, next day's data starts coming through
		.filter(({ bucket }) => parseInt(bucket.day) === parseInt(flow.day)) // parse both to ints because it can be padded with a zero
		.map(({ bucket, aar }) => ({
			iata_code: flow.name,
			year: parseInt(flow.year),
			month: parseInt(flow.month),
			day: parseInt(bucket.day),
			time: bucket.time,
			counts: bucket.counts,
			flights: bucket.flights,
			aar,
		}))
});

/**
 * Writes an airport's buckets, touching only the ones that changed.
 *
 * Every pull returns the same rolling window as the last, and nearly all of it is the same as before: the buckets in the
 * past don't move. This used to delete and re-insert the whole window each time, which left thousands of dead rows an
 * hour behind in the days every query reads, and those queries slowed down until autovacuum got around to the table
 * (every day or two). An upsert that skips identical rows writes next to nothing for the buckets that didn't change.
 *
 * Done in raw SQL because Prisma's upsert can't take the "only if different" condition, and one statement per airport
 * is also one atomic write, like the transaction it replaces.
 */
const saveBuckets = async (flow: AirportTrafficFlow) => {
	// one row per bucket: the same time twice in a statement would be "affecting a row a second time", an error
	const buckets = [...new Map(flow.time_buckets.map(bucket => [
		`${bucket.day}:${bucket.time}`,
		{ day: bucket.day, time: bucket.time, counts: bucket.counts, flights: bucket.flights, aar: bucket.aar }
	])).values()];

	if (!buckets.length) return;

	await prisma.$executeRaw`
		INSERT INTO airport_traffic_record AS t (iata_code, year, month, day, time, counts, flights, aar)
		SELECT ${flow.iata_code}::text, ${flow.year}::int, ${flow.month}::int, b.day, b.time, b.counts, b.flights, b.aar
		FROM jsonb_to_recordset(${JSON.stringify(buckets)}::jsonb)
			AS b(day int, time text, counts jsonb, flights jsonb, aar int)
		ON CONFLICT (iata_code, year, month, day, time) DO UPDATE
			SET counts = EXCLUDED.counts, flights = EXCLUDED.flights, aar = EXCLUDED.aar
			WHERE (t.counts, t.flights, t.aar) IS DISTINCT FROM (EXCLUDED.counts, EXCLUDED.flights, EXCLUDED.aar)
	`;
};

const traffic = defineTask({
	meta: {
		name: "traffic",
		description: "Pulls down current AADC records from FAA",
	},
	async run() {
		if (process.env.NODE_ENV === "development" && DEV_DISABLED === 'true') {
			console.warn('Skipped AADC traffic task due to environment config.')
			return { result: "Skipped" };
		}
		
		const start = Date.now();
		console.log("Triggering AADC traffic synchronization..");
		const tracked = new Set(
			await prisma
				.airport
				.findMany({ select: { iata_code: true } })
				.then(result => result
					.map(({ iata_code }) => iata_code)
					.filter(Boolean)
				)
		);
		
		const client = axios.create({ baseURL: 'https://www.fly.faa.gov/aadc/api' });
		const iatas = await client
			.get<string[]>('/airports')
			.then(res => res.data.filter(iata => tracked.has(iata)))
			.catch(err => {
				console.error('Error fetching tracked IATA codes:', err);
				return [];
			});
		
		if (!iatas.length) return { result: "Error" };
		
		const today = moment();
		const month = (today.month() + 1).toString();
		const targetDays = [today.date(), today.date() + 1].map(String);
		
		const airports: string[] = [];
		const skipped: string[] = [];
		const tasks = Effect.all(
			iatas
				.map(iata => Effect.promise(
					() => client
						.get<TrafficFlowResponse>(`/airports/${iata}`)
						.then(res => res.data)
						.then(res => {
							if (month !== res.month || !targetDays.includes(res.day)) {
								// console.log(`[traffic] Received out of date response for ${res.name}, skipping it.`)
								skipped.push(res.name);
								return null;
							}
							
							// console.log(`[traffic] ${res.name} traffic flow retrieved. (${res.timeBuckets.length} time buckets)`);
							airports.push(res.name);
							return res;
						})
						.catch(err => {
							console.error(`[traffic] Error fetching traffic data for ${iata}`, err);
							return null;
						}) as Promise<TrafficFlowResponse>
				)),
			{ concurrency: 2 }
		);
		
		const results = await Effect.runPromise(tasks);
		const filtered = results.filter(Boolean) as Array<TrafficFlowResponse>;
		
		console.log(`[traffic] Tracking (${airports.length}): ${airports.join(', ')}`);
		console.log(`[traffic] Skipped (${skipped.length}): ${skipped.join(', ')}`)
		// const filtered = JSON.parse(readFileSync("./out.json").toString()) as Array<TrafficFlowResponse>;
		
		console.log("[traffic] Committing to database..")
		const processTasks = Effect.all(
			filtered
				.map(sanitizeAndTransform)
				.map(flow => Effect.promise(
					() => prisma.airportTrafficFlow.upsert({
						where: {
							iata_code_year_month_day: {
								iata_code: flow.iata_code,
								day: flow.day,
								month: flow.month,
								year: flow.year
							}
						},
						update: {
							default_arrival_rate: flow.default_arrival_rate,
							arrival_rates: flow.arrival_rates,
							total_flights: flow.total_flights,
							cancelled_flights: flow.cancelled_flights,
							fixes: flow.fixes
						},
						create: {
							iata_code: flow.iata_code,
							year: flow.year,
							month: flow.month,
							day: flow.day,
							default_arrival_rate: flow.default_arrival_rate,
							arrival_rates: flow.arrival_rates,
							total_flights: flow.total_flights,
							cancelled_flights: flow.cancelled_flights,
							fixes: flow.fixes
						}
					})
					.then(() => saveBuckets(flow))
					.catch(console.error)
				)),
			{ concurrency: 15 }
		);
		
		await Effect.runPromise(processTasks);
		console.log(`[traffic] Done in ${Date.now() - start}ms.`);
		return { result: "Success" };
	},
});

export default traffic;