"use client";

import { useMemo } from "react";
import type { AirportWithJoins } from "@skywatch/gateway/schemas";
import { routeKey, typeColor, type Coverage, type RouteResult } from "./geo";
import { Leg } from "./leg";
import type { MapPair } from "./routing-map";
import { useRoutingStore } from "./store";

type Props = {
	view: "routes" | "pairs";
	routes: RouteResult[];
	pairs: Array<MapPair & { types: Record<string, number> }>;
	coverage: Coverage | undefined;
	airports: AirportWithJoins[];
};

const counts = (entry: { outbound: number; inbound: number } | undefined) =>
	entry ? `${entry.outbound.toLocaleString()} out · ${entry.inbound.toLocaleString()} in` : null;

/** What a click would do right now. Sits over the top of the map and never takes the pointer. */
export const HoverHint: React.FC<Props> = ({ view, routes, pairs, coverage, airports }) => {
	const hover = useRoutingStore(state => state.hover);
	const armed = useRoutingStore(state => state.armed);
	const selectedId = useRoutingStore(state => state.selectedId);

	const byIata = useMemo(() => new Map(airports.map(airport => [airport.iata_code, airport])), [airports]);
	const slot = armed === "from" ? "From" : "To";

	let content: React.ReactNode = null;

	if (hover.airport) {
		const airport = byIata.get(hover.airport);
		content = (
			<>
				<div><span className="text-muted-foreground">Click to set {slot}:</span> <span className="font-mono font-semibold">{hover.airport}</span></div>
				{airport && <div className="truncate text-xs text-muted-foreground">{airport.name} · {airport.municipality}</div>}
				<div className="font-mono text-xs text-muted-foreground">{counts(coverage?.airports[hover.airport])}</div>
			</>
		);
	} else if (hover.routes.length && view === "pairs") {
		const hovered = hover.routes
			.map(id => pairs.find(pair => pair.id === id))
			.filter((pair): pair is NonNullable<typeof pair> => Boolean(pair));

		content = (
			<>
				{hovered.slice(0, 4).map(pair => (
					<div key={pair.id} className="grid gap-0.5">
						<div className="font-mono font-semibold">
							<Leg from={pair.origin} to={pair.dest} />
						</div>
						<div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
							{pair.count} {pair.count === 1 ? "route" : "routes"}
							{Object.entries(pair.types).map(([type, count]) => (
								<span key={type} className="flex items-center gap-1">
									<span className="size-2 rounded-full" style={{ backgroundColor: typeColor(type) }} />
									{type} {count}
								</span>
							))}
						</div>
					</div>
				))}
				{hovered.length > 4 && <div className="text-xs text-muted-foreground">and {hovered.length - 4} more</div>}
				<div className="text-xs text-muted-foreground">Click to see {hovered.length > 1 ? "the first pair's" : "its"} routes</div>
			</>
		);
	} else if (hover.routes.length) {
		const hovered = hover.routes
			.map(id => routes.find(route => routeKey(route) === id))
			.filter((route): route is RouteResult => Boolean(route));

		content = (
			<>
				<div>
					<span className="font-mono font-semibold">{hover.routes.length}</span>{" "}
					<span className="text-muted-foreground">{hover.routes.length === 1 ? "route" : "routes"} here</span>
				</div>
				{hovered.slice(0, 4).map(route => (
					<div key={routeKey(route)} className="flex items-center gap-1.5 font-mono text-xs">
						<span className="size-2 rounded-full" style={{ backgroundColor: typeColor(route.type) }} />
						<Leg from={route.origin} to={route.dest} />
						<span className="text-muted-foreground">{route.type}</span>
					</div>
				))}
				{hovered.length > 4 && <div className="text-xs text-muted-foreground">and {hovered.length - 4} more</div>}
				<div className="text-xs text-muted-foreground">Click to select{hover.routes.length > 1 ? " the first" : ""}</div>
			</>
		);
	} else if (hover.artcc && !selectedId) {
		content = (
			<>
				<div><span className="text-muted-foreground">Click to set {slot}:</span> <span className="font-mono font-semibold">{hover.artcc}</span> <span className="text-xs text-muted-foreground">center</span></div>
				<div className="font-mono text-xs text-muted-foreground">{counts(coverage?.artccs[hover.artcc])}</div>
			</>
		);
	}

	if (!content) return null;

	return (
		<div className="pointer-events-none absolute top-2 left-1/2 z-10 grid max-w-xs -translate-x-1/2 gap-0.5 rounded-lg border bg-background/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur lg:left-[calc(50%+10rem)]">
			{content}
		</div>
	);
};
