"use client";

import { useMemo } from "react";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { AirportAdvisory } from "~/lib/schemas";
import { closureScope } from "@skywatch/gateway/schemas";
import { useIsMounted } from "~/hooks/use-is-mounted";

/**
 * What's wrong at an airport right now, from the FAA's live airport status feed, worst first. Only the things that stop
 * or slow flights count: notices, runway configurations and de-icing aren't interruptions.
 */
export type LiveStatus = "closure" | "limited_closure" | "ground_stop" | "ground_delay" | "delay";

type StatusInfo = {
	label: string;
	/** the ring on the map, and the dot in the key: the same colors as the airspace page's markers */
	color: string;
	/** the pulse: closures and ground stops are the ones where nothing is moving */
	pulse: boolean;
	/** a dashed ring and a hollow dot: it's the color of the thing it's a version of, but not the thing */
	hollow?: boolean;
};

export const STATUS: Record<LiveStatus, StatusInfo> = {
	closure: { label: "Closed", color: "#f87171", pulse: true },
	// a closure with a qualifier (a daily window, or only some traffic): red like a closure, but it doesn't shut the airport
	limited_closure: { label: "Limited closure", color: "#f87171", pulse: false, hollow: true },
	ground_stop: { label: "Ground stop", color: "#fb923c", pulse: true },
	ground_delay: { label: "Ground delay", color: "#facc15", pulse: false },
	delay: { label: "Delays", color: "#facc15", pulse: false }
};

export type LiveAirport = {
	iata: string;
	status: LiveStatus;
	/** the FAA's whole notice: the hover card is the airspace page's, which reads it */
	advisory: AirportAdvisory;
};

const REFRESH = 60 * 1000;

export const useLiveStatus = () => {
	const query = useQuery({
		...orpc.airspace.interruptions.active.queryOptions({ input: {} }),
		// it's called live: ask again every minute (the gateway caches it for one)
		refetchInterval: REFRESH,
		staleTime: REFRESH / 2
	});

	return useMemo(() => {
		const airports = new Map<string, LiveAirport>();

		for (const advisory of query.data ?? []) {
			let status: LiveStatus | null = null;

			// the same order as the airspace page's: a limited closure ranks below a stop or a delay that's also going on
			if (advisory.airportClosure && closureScope(advisory.airportClosure) === "full") status = "closure";
			else if (advisory.groundStop) status = "ground_stop";
			else if (advisory.groundDelay) status = "ground_delay";
			else if (advisory.departureDelay || advisory.arrivalDelay) status = "delay";
			else if (advisory.airportClosure) status = "limited_closure";

			if (!status) continue;
			airports.set(advisory.airportId, { iata: advisory.airportId, status, advisory });
		}

		const count = (...statuses: LiveStatus[]) => [...airports.values()].filter(airport => statuses.includes(airport.status)).length;

		return {
			loaded: query.data !== undefined,
			airports,
			closed: count("closure"),
			limited: count("limited_closure"),
			groundStops: count("ground_stop"),
			delayed: count("ground_delay", "delay"),
			total: airports.size
		};
	}, [query.data]);
};

/** How busy each airport is, for the size of its marker: [iata, flights landing there in the last 30 days]. */
export const useVolume = () => {
	const { data } = useQuery({ ...orpc.statistics.volume.queryOptions(), staleTime: 10 * 60 * 1000 });

	return useMemo(() => {
		const flights = new Map(data?.airports ?? []);
		return { flights, max: Math.max(1, ...flights.values()) };
	}, [data]);
};

const Dot: React.FC<{ color: string; pulse?: boolean; hollow?: boolean }> = ({ color, pulse, hollow }) => (
	<span className="relative flex size-2.5 shrink-0 items-center justify-center">
		{pulse && <span className="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" style={{ backgroundColor: color }} />}
		<span
			className="relative size-2 rounded-full"
			style={hollow ? { border: `1.5px solid ${color}`, backgroundColor: `${color}33` } : { backgroundColor: color }}
		/>
	</span>
);

/** The key to the rings on the map: what's wrong right now, and how many airports it is. */
export const LiveStatusKey: React.FC = () => {
	const mounted = useIsMounted();
	const live = useLiveStatus();

	// the page is rendered ahead of time and this changes by the minute: nothing until we're really on it
	if (!mounted || !live.loaded) return <div className="mt-2 h-5" />;

	if (live.total === 0) return (
		<div className="mt-2 flex items-center gap-2 font-mono text-sm text-muted-foreground">
			<Dot color="#4ade80" />
			No airport delays or closures right now
		</div>
	);

	const entries = [
		{ key: "closure", count: live.closed, label: "closed", status: STATUS.closure },
		{ key: "limited_closure", count: live.limited, label: "limited", status: STATUS.limited_closure },
		{ key: "ground_stop", count: live.groundStops, label: "ground stopped", status: STATUS.ground_stop },
		{ key: "delay", count: live.delayed, label: "delayed", status: STATUS.delay }
	].filter(entry => entry.count > 0);

	return (
		<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
			<span className="text-muted-foreground">Right now</span>
			{entries.map(entry => (
				<span key={entry.key} className="inline-flex items-center gap-1.5">
					<Dot color={entry.status.color} pulse={entry.status.pulse} hollow={entry.status.hollow} />
					<span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.count}</span>
					<span className="text-muted-foreground">{entry.label}</span>
				</span>
			))}
		</div>
	);
};
