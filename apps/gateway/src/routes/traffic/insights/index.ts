import { base } from "~/utils";
import { ORPCError } from "@orpc/server";
import { prisma } from "~/services/prisma";

import { centers } from "./by-center";
import { statuses } from "./by-status";
import { aircraft } from "./by-aircraft";
import { arrivalCapacity } from "./arrival-capacity";

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

type TrafficDataMarker = {
	year: number;
	month: number;
	day: number;
}

export type FlowMetricType = "STATUS" | "CENTER" | "FIX";

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

export const injectDataMarker = base.middleware<
	{ marker: TrafficDataMarker },
	unknown, unknown
>(async ({ next }) => {
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
		})
		.then(marker => {
			if (!marker || !marker.month || !marker.day) {
				return null;
			}
			
			return marker;
		})
		.catch(() => null);
	
	if (!marker) throw new ORPCError("NO_DATA_ERROR", {
		message: "There isn't any traffic data yet"
	});
	
	return next({ context: { marker } })
});

export const insights = {
	arrivalCapacity, aircraft, centers, statuses
}