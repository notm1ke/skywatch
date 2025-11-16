"use server";

import moment from "moment";

import { prisma } from "./prisma";
import { okAsync, raise } from "./actions";
import { Prisma } from "~/prisma/generated/client";
import { ChartConfig } from "~/components/ui/chart";

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

export type CommonPaxAircraftType = typeof CommonPaxAircraft[number];

const CommonPaxAircraft = [
	// airbus
	"A319", "A320", "A321", "A333", "A338", "A339", "A359", "A35K", "A388", "BCS1", "BCS2",
	// boeing
	"B37M","B38M","B39M","B712","B737","B738","B739","B744","B748","B752","B753","B762","B763","B764","B772","B773","B77L","B77W","B788","B789","B78X",
	// bombardier
	"CRJ1", "CRJ2", "CRJ7", "CRJ9", "E135",
	// embraer
	"E145", "E170", "E195", "E290", "E295", "E45X", "E75L", "E75S"
] as const;

export type CommonAirlineType = typeof CommonAirlines[number];

const CommonAirlines = [
	"AAL", "SWA", "DAL", "UAL", "FDX", "ASA", "JBU", "UPS", "NKS",
	"FFT", "AAY", "HAL", "BAW", "DLH", "UAE", "QTR", "ACA", "AFR",
	"KLM", "ANA", "THY", "CPA", "SIA", "EVA", "ETH"
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

export type UnknownAggregationChartResponse = TrafficFlow<any>;

export type DataPoint<K extends string = string> = {
	time: string;
	datum: Record<K, number>;
	cumulative: number;
};

export type TrafficFlow<K extends string = string> = {
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

type FlowMarker = {
	year: number;
	month: number;
	day: number;
}

type AggMode = typeof ValidModes[number];

const ValidModes = [
	'traffic_by_status',
	'traffic_by_center',
	'traffic_by_airline',
	'traffic_by_aircraft',
	'arrival_capacity'
] as const;

export const fetchAggregatedTrafficFlow = async (mode: AggMode) => {
	if (!ValidModes.includes(mode)) return raise('Bad request');

	const marker = await getLatestDateMarker();
	if (!marker) return raise("No data yet");

	if (mode === "arrival_capacity") return okAsync(arrivalCapacityData(marker));
	if (mode === "traffic_by_aircraft") return okAsync(trafficByAircraft(marker));
	if (mode === "traffic_by_airline") return raise("todo") 

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
	if (mode === 'traffic_by_status') return okAsync<TrafficFlow<FlowStatusMetricKeys>>(
		trafficByStatusData(agg)
	);

	if (mode === 'traffic_by_center') return okAsync<TrafficFlow<AirspaceType>>(
		trafficByCenterData(agg)
	);

	return raise("Not implemented yet");
}

const getLatestDateMarker = async () => await prisma
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

const trafficByStatusData = async (agg: TrafficFlowAggregation[]): Promise<TrafficFlow<FlowStatusMetricKeys>> => ({
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
			datum: {
				arrived: Number(records?.find(row => row.name === 'Arrived')?.total) || 0,
				departing: Number(records?.find(row => row.name === 'Departing')?.total) || 0,
				flight_active: Number(records?.find(row => row.name === 'Flight Active')?.total) || 0,
				edct_issued: Number(records?.find(row => row.name === 'EDCT Issued')?.total) || 0,
				irregular: Number(records?.find(row => row.name === 'Irregular')?.total) || 0,
				past_dept_time: Number(records?.find(row => row.name === 'Past Dept Time')?.total) || 0,
			},
			cumulative: Number(records?.reduce((acc, row) => acc + Number(row.cumulative), 0)) || 0
		}))
		.sort((a, b) => a.time.localeCompare(b.time))
});

const trafficByCenterData = async (agg: TrafficFlowAggregation[]): Promise<TrafficFlow<AirspaceType>> => {
	const forAllCenters = (records: TrafficFlowAggregation[] | undefined) => {
		const all: Record<AirspaceType, number> = Object.values(Airspaces).reduce((acc, center) => {
			acc[center] = Number(records?.find(row => row.name === center)?.total || 0);
			return acc;
		}, {} as Record<AirspaceType, number>);

		return all;
	};

	return {
		config: TrafficByCenterConfig,
		dataKeys: [...Airspaces],
		data: Object
			.entries(Object.groupBy(agg, row => row.time))
			.map(([time, records]) => ({
				time,
				datum: forAllCenters(records),
				cumulative: Number(records?.reduce((acc, row) => acc + Number(row.cumulative), 0)) || 0,
			}))
			.sort((a, b) => a.time.localeCompare(b.time))
	};
}

const trafficByAircraft = async (marker: FlowMarker): Promise<TrafficFlow<string>> => {
	const records = await prisma.airportTrafficFlowRecord.findMany({
		where: marker,
		select: {
			time: true,
			flights: true
		}
	});
	
	const tracked = new Set<CommonPaxAircraftType>();
	const dataPoints = records.reduce((acc, bucket) => {
		const { flights } = bucket;
		for (const flight of flights) {
			const type = flight.type as CommonPaxAircraftType;
			if (!CommonPaxAircraft.includes(type)) continue;
			if (!tracked.has(type)) tracked.add(type);
			acc[type] = (acc[type] || 0) + 1;
		}
		
		return acc;
	}, {} as Record<CommonPaxAircraftType, number>);
	
	// d3 treechart, not recharts, so this is a non-standard response
	const flow: TrafficFlow<string> = {
		config: {},
		dataKeys: Array.from(tracked),
		data: [
			{
				time: "",
				datum: dataPoints,
				cumulative: Object.values(dataPoints).reduce((acc, val) => acc + val, 0)
			}
		]
	}
	
	return flow;
}

const arrivalCapacityData = async (marker: FlowMarker): Promise<TrafficFlow<'rate'>> => {
	const airports = await prisma.airportTrafficFlow.findMany({
		where: marker,
		select: { arrival_rates: true }
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

	const data: TrafficFlow<'rate'> = {
		config: ArrivalRatesConfig,
		dataKeys: ['rate'],
		data: dataset.map((rate, index) => ({
			time: spans[index],
			datum: { rate },
			cumulative: 0,
		}))
	};

	return data;
}
