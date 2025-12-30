import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { injectDataMarker } from "@/middleware/traffic-marker";

import {
	Airspaces,
	AirspaceType,
	ChartConfig,
	TrafficFlowAggregation
} from "@/schemas";

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

const forAllCenters = (records: TrafficFlowAggregation[] | undefined) => {
	const all: Record<AirspaceType, number> = Object.values(Airspaces).reduce((acc, center) => {
		acc[center] = Number(records?.find(row => row.name === center)?.total || 0);
		return acc;
	}, {} as Record<AirspaceType, number>);

	return all;
};

export const centers = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
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
					AND elem->>'type' = 'CENTER'
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
	})
