"use client";

import { cn } from "cnfast";
import { useMemo } from "react";
import { orpc } from "~/lib/gateway";
import { flowCenterColors, shortNumberFormatter } from "~/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ReferenceCard } from "../reference/primitives";
import { TrafficByAirlineChart } from "~/components/airspace/traffic/by-airline";
import { TrafficByAircraftChart } from "~/components/airspace/traffic/by-aircraft";
import { BarList, BoundedBody, Query, QueryBody } from "./shared";

type Scope = { iata: string; date: string | undefined; className?: string };

/** Airlines / aircraft are d3 treemaps whose single data point carries every key's count. */
const totalOf = (query: Query<{ data: Array<{ cumulative: number }> }>) =>
	query.data?.data[0] ? shortNumberFormatter.format(query.data.data[0].cumulative) : undefined;

export const AirlinesCard: React.FC<Scope> = ({ iata, date, className }) => {
	const query = useQuery({
		...orpc.traffic.airline.queryOptions({ input: { airport: iata, date } }),
		placeholderData: keepPreviousData
	});

	return (
		<ReferenceCard title="Airlines" meta={totalOf(query)} className={className}>
			<QueryBody query={query} height={250} title="Couldn't load airlines">
				{chart => <TrafficByAirlineChart chart={chart} />}
			</QueryBody>
		</ReferenceCard>
	);
};

export const AircraftCard: React.FC<Scope> = ({ iata, date, className }) => {
	const query = useQuery({
		...orpc.traffic.aircraft.queryOptions({ input: { airport: iata, date } }),
		placeholderData: keepPreviousData
	});

	return (
		<ReferenceCard title="Aircraft types" meta={totalOf(query)} className={className}>
			<QueryBody query={query} height={250} title="Couldn't load aircraft types">
				{chart => <TrafficByAircraftChart chart={chart} />}
			</QueryBody>
		</ReferenceCard>
	);
};

/**
 * Where inbound flights depart from, by FAA center. The endpoint is a time series; we total it.
 *
 * The list is taken out of the card's flow (absolute + scroll) so the row is as tall as the two treemap
 * cards and no taller; the card stretches to match and the list scrolls inside it (with the shared edge mask). When stacked (below
 * `lg`) there's no row to match, so it falls back to the shared panel height.
 */
export const CentersCard: React.FC<Scope> = ({ iata, date, className }) => {
	const query = useQuery({
		...orpc.traffic.centers.queryOptions({ input: { airport: iata, date } }),
		placeholderData: keepPreviousData
	});

	const items = useMemo(() => {
		const chart = query.data;
		if (!chart) return [];
		return chart.dataKeys
			.map(center => ({ center, flights: chart.data.reduce((acc, point) => acc + (point.datum[center] ?? 0), 0) }))
			.filter(item => item.flights > 0)
			.sort((a, b) => b.flights - a.flights);
	}, [query.data]);

	const total = items.reduce((acc, item) => acc + item.flights, 0);

	return (
		<ReferenceCard
			title="Origin centers"
			meta={total ? shortNumberFormatter.format(total) : undefined}
			className={cn("flex flex-col", className)}
		>
			<BoundedBody>
				<QueryBody query={query} height={250} title="Couldn't load origin centers">
					{() => (
						<BarList
							empty="No origin data for this day."
							items={items.map(item => ({
								key: item.center,
								label: item.center,
								value: item.flights,
								color: flowCenterColors(item.center),
								right: <>{item.flights.toLocaleString()} <span className="text-xs text-muted-foreground">{((item.flights / total) * 100).toFixed(0)}%</span></>
							}))}
						/>
					)}
				</QueryBody>
			</BoundedBody>
		</ReferenceCard>
	);
};
