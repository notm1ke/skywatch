import { z } from "zod/v4";

export type HeaderStats = {
	top10: Array<{
		iata_code: string;
		iso_region: string;
		name: string;
		flights: number;
	}>;
	total: number;
}

const MetricType = z.enum(["CENTER", "STATUS", "FIX"]);

const TimeBucket = z.object({
	day: z.coerce.number(),
	time: z.string(),
	counts: z.array(z.object({
		type: MetricType,
		name: z.string(),
		count: z.coerce.number()
	})),
	flights: z.array(z.object({
		acid: z.string(), // callsign i.e. UAL1609
		type: z.string(), // IATA aircraft type i.e. B739
		origin: z.string(), // origin IATA
		destination: z.string(), // destination IATA
		etd: z.string(), // est. time of departure, i.e. A09/0422 (perhaps 11/9 at 0422?)
		ete: z.string(), // est. time en-route (224 - 2h24m or 224m?)
		departureCenter: z.string(), // origin airspace facility
		majorAirline: z.string(), // ICAO airline designator
	}))
});

export const TrafficFlowResponse = z.object({
	name: z.string(), // IATA
	totalFlightCount: z.coerce.number(),
	cancelledFlightCount: z.number(),
	dateTime: z.string(),
	month: z.coerce.number(),
	day: z.coerce.number(),
	year: z.coerce.number(),
	defaultAarRate: z.coerce.number(),
	control: z.string(),
	rates: z.array(z.coerce.number()),
	fixes: z.array(z.string()), // waypoints
	timeBuckets: z.array(TimeBucket)
});

export type ChartConfig = {
	[k in string]: {
		label?: string
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<"light" | "dark", string> }
	)
}

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

export type FlowMetricType = "STATUS" | "CENTER" | "FIX";

export type FlowStatusMetricKeys =
	| "past_dept_time"
	| "departing"
	| "edct_issued"
	| "irregular"
	| "flight_active"
	| "arrived";

export type TrafficFlowAggregation = {
	type: FlowMetricType;
	time: string;
	name: string;
	total: number;
	cumulative: number;
}
export type AirspaceType = typeof Airspaces[number];

export const Airspaces = [
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