"use server";

import axios from "axios";
import moment from "moment-timezone";

import { redis } from "./redis";
import { prisma } from "./prisma";
import { Prisma } from "~/prisma/generated/client";
import { ChartConfig } from "~/components/ui/chart";
import { ok, okAsync, raise, unwrap } from "./actions";

import {
	capitalizeFirst,
	formatFaaTime,
	safeParseJson
} from "./utils";

export type AirportAdvisory = {
	airportId: string; // IATA
	groundStop?: GroundStopAdvisory;
	groundDelay?: GroundDelayAdvisory;
	airportClosure?: any;
	freeForm?: FreeFormAdvisory;
	arrivalDelay?: DelayAdvisory;
	departureDelay?: DelayAdvisory;
	airportConfig?: AirportConfig;
	deicing?: DeicingAdvisory;
	airportLongName: string;
	latitude: string;
	longitude: string;
}

export type GroundDelayAdvisory = {
	id: string;
	startTime: string;
	endTime: string;
	createdAt: string;
	updatedAt: string;
	sourceTimeStamp: string;
	airportId: string; // IATA
	impactingCondition: string;
	avgDelay: number; // minutes
	maxDelay: number; // minutes
	center: string;
	advisoryUrl: string;
	departureScope?: any;
	includedFacilities: string[];
	fuelFlowAdvisoryDelayTime: {
		id: string;
		controlElement: string; // IATA
		delayProgramType: string; // GDP (ground delay program?) then maybe GSP (ground stop program)
		startTime: string;
		endTime: string;
		dasDelays: {
			delayTimeAmount: string; // datetime
			dasDelay: Array<{
				delay: number;
				seq: number;
			}>;
			sourceTimeStamp: string;
			createdAt: string;
			updatedAt: string;
		}
	};
	includedFlights: string;
	fadtParamType: string; // GDP/GSP
	gsCancelReceivedTs?: string; // datetime?
	gsCancelSourceTs?: string; // datetime?
	compression: boolean;
	blanket: boolean;
}

export type GroundStopAdvisory = {
	id: string;
	airportId: string;
	createdAt: string;
	sourceTimeStamp: string;
	updatedAt: string;
	impactingCondition: string;
	programExpirationTime: string;
	startTime: string;
	endTime: string;
	center: string;
	advisoryUrl: string;
	includedFacilities: string[];
	includedFlights: string;
	probabilityOfExtension: string;
}

export type FreeFormAdvisory = {
	id: string;
	airportId: string; // IATA
	createdAt?: string;
	updatedAt?: string;
	startTime: string;
	endTime: string;
	simpleText: string;
	text: string;
	notamNumber: number;
	issuedDate: string;
}

export type DeicingAdvisory = {
	id: string;
	airportId: string; // IATA
	createdAt: string;
	updatedAt: string;
	eventTime: string;
	expTime: string;
}

export type DelayAdvisory = {
	airportId: string;
	reason: string;
	arrivalDeparture: {
		type: string;
		min: string; // fmt time string i.e. 1 hour and 1 minute
		max: string; // fmt time string i.e. 1 hour and 1 minute
		trend: string;
	};
	updateTime: string;
	averageDelay: string;
	trend: string;
}

export type AirportConfig = {
	id: string;
	airportId: string; // IATA
	createdAt: string;
	sourceTimeStamp: string;
	arrivalRate: number;
	arrivalRunwayConfig: string;
	departureRunwayConfig: string;
}

type OperationsPlanResponse = {
	link: string;
	terminalPlanned: RawPlannedEvent[];
	enRoutePlanned: RawPlannedEvent[];
}

type RawPlannedEvent = {
	time: string;
	event: string;
}

export type PlannedAirportEvent = {
	time: string;
	forecastType: "until" | "after";
	iataCode: string;
	eventType: string;
}

export type CancellationStats = {
	total: number;
	cancelled: number;
	interrupted: number;
}

export type AirspaceType = typeof Airspaces[number];

const Airspaces = [
	'ZAB',
	'ZAU',
	'ZBW',
	'ZDC',
	'ZDV',
	'ZFW',
	'ZHU',
	'ZID',
	'ZJX',
	'ZKC',
	'ZLA',
	'ZLC',
	'ZMA',
	'ZME',
	'ZMP',
	'ZNY',
	'ZOA',
	'ZOB',
	'ZSE',
	'ZTL'
] as const;

export type FlowMetricType = "STATUS" | "CENTER" | "FIX";
export type FlowStatusMetricNames =
	| "Past Dept Time"
	| "Departing"
	| "EDCT Issued"
	| "Irregular"
	| "Flight Active"
	| "Arrived";

export type FlowStatusMetricKeys =
	| "past_dept_time"
	| "departing"
	| "edct_issued"
	| "irregular"
	| "flight_active"
	| "arrived";

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

export type AirportTrafficFlow = Prisma.AirportTrafficFlowGetPayload<{
	include: { time_buckets: true };
}>;

type DataPoint<K extends string> = { time: string } & Record<K, number>;

export type UnknownAggregationChartResponse = AggregationChartResponse<any>;

export type AggregationChartResponse<K extends string = string> = {
	config: ChartConfig;
	dataKeys: K[];
	data: Array<DataPoint<K>>;
}

type TrafficFlowAggregation = {
	type: FlowMetricType;
	time: string;
	name: string;
	total: number;
	cumulative: number;
}

const TrafficByStatusConfig = {
	arrived: {
		label: "Arrived",
		color: "var(--color-green-400)"
	},
	departing: {
		label: "Departing",
		color: "var(--color-green-400)"
	},
	flight_active: {
		label: "Flight Active",
		color: "var(--color-green-400)"
	},
	past_dept_time: {
		label: "Delayed",
		color: "var(--color-yellow-400)"
	},
	edct_issued: {
		label: "EDCT Issued",
		color: "var(--color-yellow-400)"
	},
	irregular: {
		label: "Irregular",
		color: "var(--color-red-400)"
	},
} satisfies ChartConfig;

const TrafficByCenterConfig = {
	count: {
		label: "Count"
	},
	zab: {
		label: "ZAB",
		color: "var(--color-red-400)"
	},
	zau: {
		label: "ZAU",
		color: "var(--color-orange-400)"
	},
	zbw: {
		label: "ZBW",
		color: "var(--color-amber-400)"
	},
	zdc: {
		label: "ZDC",
		color: "var(--color-yellow-400)"
	},
	zdv: {
		label: "ZDV",
		color: "var(--color-lime-400)"
	},
	zfw: {
		label: "ZFW",
		color: "var(--color-green-400)"
	},
	zhu: {
		label: "ZHU",
		color: "var(--color-emerald-400)"
	},
	zid: {
		label: "ZID",
		color: "var(--color-teal-400)"
	},
	zjx: {
		label: "ZJX",
		color: "var(--color-cyan-400)"
	},
	zkc: {
		label: "ZKC",
		color: "var(--color-sky-400)"
	},
	zla: {
		label: "ZLA",
		color: "var(--color-blue-400)"
	},
	zlc: {
		label: "ZLC",
		color: "var(--color-indigo-400)"
	},
	zma: {
		label: "ZMA",
		color: "var(--color-violet-400)"
	},
	zme: {
		label: "ZME",
		color: "var(--color-purple-400)"
	},
	zmp: {
		label: "ZMP",
		color: "var(--color-fuschia-400)"
	},
	zny: {
		label: "ZNY",
		color: "var(--color-pink-400)"
	},
	zoa: {
		label: "ZOA",
		color: "var(--color-rose-400)"
	},
	zob: {
		label: "ZOB",
		color: "var(--color-slate-600)"
	},
	zse: {
		label: "ZSE",
		color: "var(--color-gray-600)"
	},
	ztl: {
		label: "ZTL",
		color: "var(--color-zinc-600)"
	},
	other: {
		label: "Other",
		color: "var(--color-blue-400)"
	}
} satisfies ChartConfig;

const ArrivalRatesConfig = {
	rate: {
		label: "Throughput",
		color: "var(--color-green-400)"
	}
} satisfies ChartConfig;

const AIRSPACE_STATUS_CACHE_KEY = 'airspace:status';
const PLANNED_EVENTS_CACHE_KEY = 'airspace:planned';
	
export const fetchAirspaceStatus = async () => okAsync(redis
	.get(AIRSPACE_STATUS_CACHE_KEY)
	.then(response => {
		if (response) return safeParseJson<AirportAdvisory[]>(response);
		return axios
			.get<AirportAdvisory[]>('https://nasstatus.faa.gov/api/airport-events')
			.then(res => res.data)
			.then(data => {
				redis
					.set(AIRSPACE_STATUS_CACHE_KEY, JSON.stringify(data))
					.then(() => redis.expire(AIRSPACE_STATUS_CACHE_KEY, 60 * 5));
				
				return data;
			})
	}),
	err => err.message
);

export const fetchPlannedEvents = async () => okAsync(redis
	.get(PLANNED_EVENTS_CACHE_KEY)
	.then(response => {
		if (response) return safeParseJson<PlannedAirportEvent[]>(response);
		return axios
			.get<OperationsPlanResponse>('https://nasstatus.faa.gov/api/operations-plan')
			.then(res => res.data)
			.then(data => {
				const enriched = data
					.terminalPlanned
					.map(enrichPlannedEvent);
				
				redis
					.set(PLANNED_EVENTS_CACHE_KEY, JSON.stringify(enriched))
					.then(() => redis.expire(PLANNED_EVENTS_CACHE_KEY, 60 * 10));
				
				return enriched;
			})
	}),
	err => err.message
);

const enrichPlannedEvent = (response: RawPlannedEvent): PlannedAirportEvent => {
	const [iataCode, ...eventType] = response.event.split(' ');
	const rawTime = response.time.split(' ')[1];
	
	return {
		iataCode,
		time: formatFaaTime(rawTime),
		forecastType: response.time.split(' ')[0] === 'AFTER'
			? 'after'
			: 'until',
		eventType: capitalizeFirst(eventType.join(' ').toLowerCase())
	}
}

type FlowMarker = {
	year: number;
	month: number;
	day: number;
}

type AggMode = 
	| 'traffic_by_status'
	| 'traffic_by_center'
	| 'traffic_by_airline'
	| 'traffic_by_aircraft'
	| 'arrival_capacity';

export const fetchAggregatedTrafficFlow = async (mode: AggMode) => {
	const valid = ['traffic_by_status', 'traffic_by_center', 'traffic_by_airline', 'traffic_by_aircraft', 'arrival_capacity'];
	if (!valid.includes(mode)) return raise('Bad request');
	
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
		});
	
	if (!marker || !marker?.day || !marker?.month || !marker?.year) {
		return raise("No data yet");
	}
	
	if (mode === "arrival_capacity") return okAsync(computeArrivalCapacityData(marker));
	if (mode === "traffic_by_aircraft") {
		
		return;
	}
	
	const filter = mode === 'traffic_by_center' ? 'CENTER' : 'STATUS';
	const agg = await prisma.$queryRaw<TrafficFlowAggregation[]>`
		WITH aggregated AS (
			SELECT
				elem->>'type' AS type,
				time,
				elem->>'name' AS name,
				SUM((elem->>'count')::int) AS total
			FROM airport_traffic_record,
			LATERAL jsonb_array_elements(counts) elem
			WHERE
				year = ${marker.year}
				AND month = ${marker.month}
				AND day = ${marker.day}
				AND elem->>'type' = ${filter}
			GROUP BY type, time, name
		)
		SELECT
			type,
			time,
			name,
			total,
			SUM(total) OVER (
				PARTITION BY type, name
				ORDER BY time
				ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
			) AS cumulative
		FROM aggregated
		ORDER BY time, type, name;
	`;
	
	if (!agg) return raise("No data yet");
	if (mode === 'traffic_by_status') return ok<AggregationChartResponse<FlowStatusMetricKeys>>({
		config: TrafficByStatusConfig as ChartConfig,
		dataKeys: [
			"arrived",
			"departing",
			"flight_active",
			"edct_issued",
			"irregular",
			"past_dept_time"
		],
		data: Object
			.entries(Object.groupBy(agg, row => row.time))
			.map(([time, records]) => ({
				time,
				arrived: Number(records?.find(row => row.name === 'Arrived')?.total) || 0,
				departing: Number(records?.find(row => row.name === 'Departing')?.total) || 0,
				flight_active: Number(records?.find(row => row.name === 'Flight Active')?.total) || 0,
				edct_issued: Number(records?.find(row => row.name === 'EDCT Issued')?.total) || 0,
				irregular: Number(records?.find(row => row.name === 'Irregular')?.total) || 0,
				past_dept_time: Number(records?.find(row => row.name === 'Past Dept Time')?.total) || 0,
				cumulative: Number(records?.reduce((acc, row) => acc + Number(row.cumulative), 0)) || 0
			}))
			.sort((a, b) => a.time.localeCompare(b.time))
	});
	
	if (mode === 'traffic_by_center') {
		const forAllCenters = (records: TrafficFlowAggregation[] | undefined) => {
			const all: Record<AirspaceType, number> = Object.values(Airspaces).reduce((acc, center) => {
				acc[center] = Number(records?.find(row => row.name === center)?.total || 0);
				return acc;
			}, {} as Record<AirspaceType, number>);
			
			return all;
		};
		
		return ok<AggregationChartResponse<AirspaceType>>({
			config: TrafficByCenterConfig,
			dataKeys: [...Airspaces],
			data: Object
				.entries(Object.groupBy(agg, row => row.time))
				.map(([time, records]) => ({
					time,
					cumulative: Number(records?.reduce((acc, row) => acc + Number(row.cumulative), 0)) || 0,
					...forAllCenters(records)
				}))
				.sort((a, b) => a.time.localeCompare(b.time))
		});
	}
	
	return raise("Not implemented yet");
}

const computeArrivalCapacityData = async (marker: FlowMarker): Promise<AggregationChartResponse<'rate'>> => {
	const airports = await prisma.airportTrafficFlow.findMany({
		where: marker,
		select: {
			arrival_rates: true
		}
	});
	
	const duration = moment.duration(1.5, 'hours');
	const spans = Array
		.from({ length: 16 }, (_, i) => moment()
			.startOf('day')
			.add(i * duration.as('hours'), 'hours')
			.format('HHmm')
		);
	
	const dataset = airports.reduce((acc, airport) => {
		const rates = airport.arrival_rates || [];
		for (let i = 0; i < 16; i++) {
			acc[i] = (acc[i] || 0) + Number(rates[i]);
		}
		return acc;
	}, [] as number[]);
	
	const data: AggregationChartResponse<'rate'> = {
		config: ArrivalRatesConfig,
		dataKeys: ['rate'],
		data: dataset.map((rate, index) => ({
			time: spans[index],
			rate
		}))
	};
	
	return data;
}

const computeAircraftStats = async (marker: FlowMarker) => {
	
}

export const fetchCancellationStats = async () => {
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
		});
	
	if (!marker || !marker?.day || !marker?.month || !marker?.year) {
		return raise("No data yet");
	}
	
	return okAsync(prisma
		.airportTrafficFlow
		.aggregate({
			where: {
				year: { equals: marker.year },
				month: { equals: marker.month },
				day: { equals: marker.day }
			},
			_sum: {
				total_flights: true,
				cancelled_flights: true
			}
		})
		.then(({ _sum: { total_flights, cancelled_flights } }) => ({
			total: total_flights ?? 0,
			cancelled: cancelled_flights ?? 0
		}))
		.then(({ total, cancelled }) => ({
			total,
			cancelled,
			interrupted: cancelled / total
		})));
}

export const fetchCompositeAirspaceData = async () => okAsync(
	Promise
		.all([
			// unwrap here rather than in a .then() so ts can infer each individual array item type
			fetchAirspaceStatus().then(unwrap),
			fetchPlannedEvents().then(unwrap),
		])
		.then(([status, planned]) => ({ status, planned })),
	err => err.message
);
