"use client";

import { cn } from "cnfast";
import { useMemo } from "react";
import { useAirports } from "~/components/airport-provider";
import { ReferenceCard } from "../reference/primitives";
import { BarList, BoundedBody, formatDuration, Query, QueryBody, TrafficMix } from "./shared";

type Props = { query: Query<TrafficMix>; className?: string };

const pct = (value: number, total: number) => (total ? `${((value / total) * 100).toFixed(0)}%` : "—");

/** Busiest origin airports, with each route's average flight time (ETA − ETD). */
export const OriginsCard: React.FC<Props> = ({ query, className }) => {
	const { airports } = useAirports();
	const cities = useMemo(
		() => new Map(airports.map(airport => [airport.iata_code, airport.municipality])),
		[airports]
	);

	return (
		<ReferenceCard title="Top origins" meta={query.data?.origins.length} className={cn("flex flex-col", className)}>
			<BoundedBody>
				<QueryBody query={query} height={250} title="Couldn't load origins">
					{mix => (
						<BarList
							empty="No flights for this day."
							items={mix.origins.map(origin => ({
								key: origin.origin,
								label: origin.origin,
								hint: <>{cities.get(origin.origin) ?? ""}{origin.avgMinutes != null && <>{cities.has(origin.origin) ? " · " : ""}{formatDuration(origin.avgMinutes)}</>}</>,
								value: origin.flights,
								right: <>{origin.flights.toLocaleString()} <span className="text-xs text-muted-foreground">{pct(origin.flights, mix.listedArrivals)}</span></>
							}))}
						/>
					)}
				</QueryBody>
			</BoundedBody>
		</ReferenceCard>
	);
};

/** Arrival fixes: how many inbound flights are routed over each. */
export const FixesCard: React.FC<Props> = ({ query, className }) => (
	<ReferenceCard title="Arrival fixes" meta={query.data?.fixes.length} className={cn("flex flex-col", className)}>
		<BoundedBody>
			<QueryBody query={query} height={250} title="Couldn't load arrival fixes">
				{mix => {
					const total = mix.fixes.reduce((acc, fix) => acc + fix.flights, 0);
					return (
						<BarList
							empty="No fix data for this day."
							items={mix.fixes.map(fix => ({
								key: fix.name,
								label: fix.name,
								value: fix.flights,
								color: fix.name === "OTHER" ? "var(--color-zinc-400)" : undefined,
								right: <>{fix.flights.toLocaleString()} <span className="text-xs text-muted-foreground">{pct(fix.flights, total)}</span></>
							}))}
						/>
					);
				}}
			</QueryBody>
		</BoundedBody>
	</ReferenceCard>
);

/** Stage length: how far inbound flights travel, as flight-time bands. */
export const StageLengthCard: React.FC<Props> = ({ query, className }) => (
	<ReferenceCard
		title="Flight time"
		meta={query.data?.stageLength.avgMinutes != null ? `avg ${formatDuration(query.data.stageLength.avgMinutes)}` : undefined}
		className={cn("flex flex-col", className)}
	>
		<BoundedBody>
			<QueryBody query={query} height={250} title="Couldn't load flight times">
				{mix => {
					const { bands } = mix.stageLength;
					const total = bands.reduce((acc, band) => acc + band.flights, 0);
					return (
						<BarList
							empty="No flight times for this day."
							items={bands.map(band => ({
								key: band.label,
								label: band.label,
								value: band.flights,
								right: <>{band.flights.toLocaleString()} <span className="text-xs text-muted-foreground">{pct(band.flights, total)}</span></>
							}))}
						/>
					);
				}}
			</QueryBody>
		</BoundedBody>

		{/* outside the scroll body so it stays visible */}
		{query.data && (
			<div className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
				Estimated departure to arrival time.{query.data.stageLength.unknown > 0 && <> {query.data.stageLength.unknown.toLocaleString()} flights had no usable times.</>}
			</div>
		)}
	</ReferenceCard>
);
