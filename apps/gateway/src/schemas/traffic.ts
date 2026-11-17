import { z } from "zod/v4";
import { AirportTrafficFlowGetPayload } from "@/prisma/generated/models";

export type AirportTrafficFlow = AirportTrafficFlowGetPayload<{
	include: { time_buckets: true };
}>;

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

/** What a `TrafficFlow` looks like once it's been through the cache (JSON), for the endpoints that cache one. */
export const TrafficFlowOutput = z.object({
	config: z.record(z.string(), z.object({
		label: z.string().optional(),
		color: z.string().optional()
	})),
	dataKeys: z.array(z.string()),
	data: z.array(z.object({
		time: z.string(),
		datum: z.record(z.string(), z.number()),
		cumulative: z.number()
	}))
});

/** How long the traffic charts are cached for. The FAA data is pulled every 30 minutes, so a few minutes is invisible. */
export const TRAFFIC_CACHE_TTL = "5 minutes";

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
	"ZAB",
	"ZAN",
	"ZAP",
	"ZAU",
	"ZBW",
	"ZDC",
	"ZDV",
	"ZFW",
	"ZHN",
	"ZHU",
	"ZID",
	"ZJX",
	"ZKC",
	"ZLA",
	"ZLC",
	"ZMA",
	"ZME",
	"ZMP",
	"ZNY",
	"ZOA",
	"ZOB",
	"ZSE",
	"ZTL",
	"ZVR",
	"ZYZ",
] as const;

export const AirspaceLocalizations: Record<string, string> = {
	"ZAB": "Albuquerque",
	"ZAK": "Oakland Oceanic",
	"ZAN": "Anchorage",
	"ZAP": "Anchorage Oceanic",
	"ZAU": "Chicago",
	"ZBW": "Boston",
	"ZDC": "Washington DC",
	"ZDV": "Denver",
	"ZFW": "Fort Worth",
	"ZHU": "Houston",
	"ZID": "Indianapolis",
	"ZJX": "Jacksonville",
	"ZKC": "Kansas City",
	"ZHN": "Honolulu",
	"ZLA": "Los Angeles",
	"ZLC": "Salt Lake City",
	"ZMA": "Miami",
	"ZME": "Memphis",
	"ZMP": "Minneapolis",
	"ZNY": "New York",
	"ZOA": "Oakland",
	"ZOB": "Cleveland",
	"ZSE": "Seattle",
	"ZTL": "Atlanta",
	"ZVR": "Vancouver",
	"ZYZ": "Toronto",
}