import axios from "axios";
import moment from "moment-timezone";

import { Effect } from "effect";
import { prisma } from "~/lib/prisma";
import { FatalError, sleep } from "workflow";
import { AirportTrafficFlow, TrafficFlowResponse } from "~/lib/faa";

// https://github.com/vercel/workflow/discussions/66#discussioncomment-14809207

export async function airportTrafficCron(once: boolean) {
	"use workflow";
	
	if (once) {
		const flows = await fetchTrafficFlows();
		await commit(flows);
		return;
	}
	
	console.log("Airport traffic sync task scheduled.");
	while (true) {
		const flows = await fetchTrafficFlows();
		await commit(flows);
		sleep("1 hour");
	}
}

async function fetchTrafficFlows(): Promise<Array<TrafficFlowResponse | null>> {
	"use step";
	
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
	
	if (!iatas.length) throw new FatalError(
		"Upstream API error"
	);
	
	const today = moment();
	const month = (today.month() + 1).toString();
	const targetDays = [today.date(), today.date() + 1].map(String);
	const tasks = Effect.all(
		iatas
			.map(iata => Effect.promise(
				() => client
					.get<TrafficFlowResponse>(`/airports/${iata}`)
					.then(res => res.data)
					.then(res => {
						if (month !== res.month || !targetDays.includes(res.day)) {
							console.log(`[Traffic] Received out of date response for ${res.name}, skipping it.`)
							console.log({ month: res.month, day: res.day });
							return null;
						}
						
						console.log(`[Traffic] ${res.name} traffic flow retrieved. (${res.timeBuckets.length} time buckets)`);
						return res;
					})
					.catch(err => {
						console.error('Error fetching traffic data for IATA:', iata, err);
						return null;
					}) as Promise<TrafficFlowResponse>
			)),
		{ concurrency: 2 }
	);
	
	return Effect.runPromise(tasks);
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
		.filter(bucket => bucket.day === flow.day) // toward the end of the day, next day's data starts coming through
		.map(bucket => ({
			iata_code: flow.name,
			year: parseInt(flow.year),
			month: parseInt(flow.month),
			day: parseInt(bucket.day),
			time: bucket.time,
			counts: bucket.counts,
			flights: bucket.flights,
		}))
})

async function commit(flows: Array<TrafficFlowResponse | null>) {
	"use step";
	
	const filtered = flows.filter(Boolean) as Array<TrafficFlowResponse>;
	console.log(`[Traffic] Attempting to commit ${filtered.length} airports`)
	
	const tasks = Effect.all(
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
						fixes: flow.fixes,
						time_buckets: {
							updateMany: flow.time_buckets.map(bucket => ({
								where: {
									iata_code: bucket.iata_code,
									day: bucket.day,
									month: bucket.month,
									year: bucket.year,
									time: bucket.time
								},
								data: {
									counts: bucket.counts,
									flights: bucket.flights
								}
							}))
						}
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
						fixes: flow.fixes,
					}
				})
				.then(() => prisma.$transaction([
					prisma.airportTrafficFlowRecord.deleteMany({
						where: {
							iata_code: flow.iata_code,
							year: flow.year,
							month: flow.month,
							day: {
								in: [...new Set(flow
									.time_buckets
									.map(bucket => bucket.day)
								)]
							},
							time: {
								in: [...new Set(flow
									.time_buckets
									.map(bucket => bucket.time)
								)]
							}
						}
					}),
					prisma.airportTrafficFlowRecord.createMany({
						data: flow.time_buckets.map(bucket => ({
							iata_code: bucket.iata_code,
							year: bucket.year,
							month: bucket.month,
							day: bucket.day,
							time: bucket.time,
							counts: bucket.counts,
							flights: bucket.flights
						}))
					})
				]))
				.catch(console.log)
			)),
		{ concurrency: 15 }
	);
	
	return Effect.runPromise(tasks);
}