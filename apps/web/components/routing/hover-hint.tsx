"use client";

import { useMemo } from "react";
import type { AirportWithJoins } from "@skywatch/gateway/schemas";
import { typeColor, type Coverage, type RouteResult } from "./geo";
import { useRoutingStore } from "./store";

type Props = {
	routes: RouteResult[];
	coverage: Coverage | undefined;
	airports: AirportWithJoins[];
};

const counts = (entry: { outbound: number; inbound: number } | undefined) =>
	entry ? `${entry.outbound.toLocaleString()} out · ${entry.inbound.toLocaleString()} in` : null;

/** What a click would do right now. Sits over the top of the map and never takes the pointer. */
export const HoverHint: React.FC<Props> = ({ routes, coverage, airports }) => {
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
	} else if (hover.routes.length) {
		const hovered = hover.routes
			.map(id => routes.find(route => route.id === id))
			.filter((route): route is RouteResult => Boolean(route));

		content = (
			<>
				<div>
					<span className="font-mono font-semibold">{hover.routes.length}</span>{" "}
					<span className="text-muted-foreground">{hover.routes.length === 1 ? "route" : "routes"} here</span>
				</div>
				{hovered.slice(0, 4).map(route => (
					<div key={route.id} className="flex items-center gap-1.5 font-mono text-xs">
						<span className="size-2 rounded-full" style={{ backgroundColor: typeColor(route.type) }} />
						{route.origin} → {route.dest}
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
