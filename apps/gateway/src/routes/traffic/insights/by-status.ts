import { z } from "zod/v4";
import { prisma } from "@/services/prisma";
import { cache } from "@/middleware/cache";
import { airspaceInput, base } from "@/utils";
import { Prisma } from "@/prisma/generated/client";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { ChartConfig, TrafficFlowAggregation } from "@/schemas";

const TrafficByStatusOutput = z.object({
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

export const statuses = base
	.input(airspaceInput)
	.use(cache(
		input => `traffic:statuses:${input.airspace ?? "all"}`,
		"1 minutes",
		TrafficByStatusOutput
	))
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input: { airspace } }) => {
		const airspaceFilter = airspace
			? Prisma.sql`AND airport_traffic_record.iata_code IN (
				SELECT iata_code FROM airports WHERE artcc = ${airspace}
			)`
			: Prisma.empty;

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
					AND elem->>'type' = 'STATUS'
					${airspaceFilter}
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
			config: TrafficByStatusConfig,
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
		}
	})
