"use client";

import Map, { Layer, Source, type MapMouseEvent, type MapRef } from "react-map-gl/mapbox";

import { useTheme } from "next-themes";
import type { FilterSpecification } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AirportWithJoins } from "@skywatch/gateway/schemas";
import { MapControls, type MapLayers } from "~/components/ui/map-controls";
import { endpointCode, isAirport, useRoutingStore } from "./store";

import {
	CENTERS,
	airportCoords,
	airportPoints,
	coveredCenters,
	fixPoints,
	pairArcs,
	pairBounds,
	routeBounds,
	routeKey,
	routeLines,
	typeColorExpression,
	type Coverage,
	type Pair,
	type RouteResult
} from "./geo";

/** a pair as the map draws it: its count already reflects the type filters */
export type MapPair = Pick<Pair, "id" | "origin" | "dest"> & { count: number };

const INITIAL_VIEW = { latitude: 37, longitude: -97.5, zoom: 3.25 };

// the floating route list covers the left of the map on desktop
const LIST_WIDTH = 360;

// how faint the other routes get while one is selected
const DIMMED_OPACITY = 0.12;

const ENDPOINT_COLOR = "#f97316";
const REACHABLE_COLOR = "#0ea5e9";

// every layer a click or hover can land on
const INTERACTIVE_LAYERS = ["airports-hit", "routes-hit", "pairs-hit", "centers-hit"];

type Props = {
	/** routes (the detailed view) or pairs (the overview of a big search) */
	view: "routes" | "pairs";
	/** the routes to draw in the routes view (type / completeness filters already applied) */
	routes: RouteResult[];
	/** the pairs to draw in the pairs view (type filters already applied) */
	pairs: MapPair[];
	/**
	 * Drives auto-framing. A new value (a result object) frames it; it changes only when a new result arrives, never on
	 * hover, filter toggles or placeholder data. null = no search (fly back to the whole country), undefined = a search
	 * is still loading (don't move).
	 */
	frameKey: unknown;
	coverage: Coverage | undefined;
	airports: AirportWithJoins[];
};

const filter = (expression: unknown) => expression as FilterSpecification;

export const RoutingMap: React.FC<Props> = ({ view, routes, pairs, frameKey, coverage, airports }) => {
	const mapRef = useRef<MapRef>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme } = useTheme();
	const dark = resolvedTheme === "dark";

	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const selectedId = useRoutingStore(state => state.selectedId);
	const hover = useRoutingStore(state => state.hover);

	const neutral = dark ? "#e4e4e7" : "#3f3f46";
	const halo = dark ? "#0a0a0a" : "#ffffff";

	// --- data: built from the search result only, so hover never re-uploads it ---------------------------
	const coords = useMemo(() => airportCoords(airports), [airports]);

	// only the active view's data is built; the other source stays empty
	const lines = useMemo(() => routeLines(view === "routes" ? routes : []), [view, routes]);
	const arcs = useMemo(() => pairArcs(view === "pairs" ? pairs : [], coords), [view, pairs, coords]);

	const reachable = useMemo(() => {
		const codes = new Set<string>();
		for (const item of view === "pairs" ? pairs : routes) {
			codes.add(item.origin);
			codes.add(item.dest);
		}

		return codes;
	}, [view, routes, pairs]);

	const airportsGeo = useMemo(() => airportPoints(airports, coverage, reachable), [airports, coverage, reachable]);
	const covered = useMemo(() => coveredCenters(coverage), [coverage]);
	const selectedRoute = useMemo(() => routes.find(route => routeKey(route) === selectedId), [routes, selectedId]);
	const fixes = useMemo(() => fixPoints(selectedRoute), [selectedRoute]);

	// --- styling that depends on selection / hover goes through layer filters ----------------------------
	const endpointAirports = [from, to].filter(isAirport).map(endpoint => endpoint.airport);
	const endpointCenters = [from, to].flatMap(endpoint => endpoint && "artcc" in endpoint ? [endpointCode(endpoint)] : []);

	const filters = {
		airportHit: filter([">", ["get", "routes"], 0]),
		airportSelected: filter(["in", ["get", "iata"], ["literal", endpointAirports]]),
		airportHover: filter(["==", ["get", "iata"], hover.airport ?? ""]),
		airportLabel: filter(["any",
			["in", ["get", "iata"], ["literal", endpointAirports]],
			["==", ["get", "iata"], hover.airport ?? ""]
		]),
		centerCovered: filter(["in", ["get", "IDENT"], ["literal", covered]]),
		centerSelected: filter(["in", ["get", "IDENT"], ["literal", endpointCenters]]),
		centerHover: filter(["==", ["get", "IDENT"], hover.artcc ?? ""]),
		routeHover: filter(["in", ["get", "id"], ["literal", hover.routes]]),
		routeSelected: filter(["==", ["get", "id"], selectedId ?? ""]),
	};

	// many routes -> fainter lines, so a whole ARTCC reads as texture and a single airport reads as lines
	const lineOpacity = Math.min(0.55, Math.max(0.1, 24 / Math.max(routes.length, 1)));

	// With a route selected the rest become dull grey context, so the selected one is all that has colour.
	// (Hovering another route still lights it up in its own colour.)
	const dimmed = Boolean(selectedRoute);
	const contextColor = dimmed ? neutral : typeColorExpression();
	const contextOpacity = dimmed ? Math.min(lineOpacity, DIMMED_OPACITY) : lineOpacity;

	// --- layers toggle -----------------------------------------------------------------------------------
	const layers: MapLayers = [
		{ key: "centers", name: "Centers", color: "var(--color-zinc-500)", count: covered.length },
		{ key: "airports", name: "Airports", color: "var(--color-sky-500)", count: airportsGeo.features.filter(f => f.properties.routes > 0).length },
	];

	const [enabledLayers, setEnabledLayers] = useState<Set<string>>(() => new Set(layers.map(layer => layer.key)));

	// --- framing: only when a new result arrives ---------------------------------------------------------
	const latest = useRef({ view, routes, pairs, coords });
	useEffect(() => {
		latest.current = { view, routes, pairs, coords };
	});

	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		// undefined = a search is still loading: leave the map where it is
		if (frameKey === undefined) return;

		const current = latest.current;
		const bounds = frameKey
			? (current.view === "pairs" ? pairBounds(current.pairs, current.coords) : routeBounds(current.routes))
			: null;
		if (!bounds) {
			// null = there's no search: back to the whole country
			if (frameKey === null) map.flyTo({ center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude], zoom: INITIAL_VIEW.zoom });
			return;
		}

		const desktop = window.innerWidth >= 1024;
		map.fitBounds(bounds, {
			padding: desktop
				? { top: 60, bottom: 60, right: 70, left: LIST_WIDTH + 40 }
				: { top: 60, bottom: 320, right: 40, left: 40 },
			maxZoom: 8,
			duration: 800
		});
	}, [frameKey]);

	// --- interaction -------------------------------------------------------------------------------------
	const handleMove = (event: MapMouseEvent) => {
		const features = event.features ?? [];
		const airport = features.find(feature => feature.layer?.id === "airports-hit")?.properties?.iata as string | undefined;

		// routes share segments (a departure procedure, an airway), so take every one under the cursor.
		// In the pairs view the same slot holds pair ids.
		const routeIds = airport
			? []
			: [...new Set(features
				.filter(feature => feature.layer?.id === "routes-hit" || feature.layer?.id === "pairs-hit")
				.map(feature => String(feature.properties?.id)))];

		const artcc = airport || routeIds.length
			? undefined
			: features.find(feature => feature.layer?.id === "centers-hit")?.properties?.IDENT as string | undefined;

		useRoutingStore.getState().setHover({ airport: airport ?? null, routes: routeIds, artcc: artcc ?? null, source: "map" });
	};

	const handleClick = (event: MapMouseEvent) => {
		const { pick, drill, select } = useRoutingStore.getState();
		const features = event.features ?? [];

		// 1. an airport that has routes
		const airport = features.find(feature => feature.layer?.id === "airports-hit")?.properties?.iata as string | undefined;
		if (airport) return pick({ airport });

		// 2. a pair (the overview): drill into the routes between its two airports
		const pairId = features.find(feature => feature.layer?.id === "pairs-hit")?.properties?.id as string | undefined;
		if (pairId) {
			const [origin, dest] = pairId.split(">");
			return drill(origin, dest);
		}

		// 3. a route
		const routeId = features.find(feature => feature.layer?.id === "routes-hit")?.properties?.id as string | undefined;
		if (routeId) return select(useRoutingStore.getState().selectedId === routeId ? null : routeId);

		// 4. with a route selected, a click on the background just deselects: almost every click lands inside
		//    some center, and picking one would fire a search that can return thousands of routes
		if (useRoutingStore.getState().selectedId) return select(null);

		// 5. otherwise a center
		const artcc = features.find(feature => feature.layer?.id === "centers-hit")?.properties?.IDENT as string | undefined;
		if (artcc) pick({ artcc });
	};

	const clickable = Boolean(hover.airport || hover.routes.length || hover.artcc);

	return (
		<div ref={containerRef} data-fullscreen={false} className="absolute inset-0 overflow-hidden">
			<Map
				ref={mapRef}
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={INITIAL_VIEW}
				projection="mercator"
				attributionControl={false}
				style={{ width: "100%", height: "100%" }}
				mapStyle={dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
				interactiveLayerIds={INTERACTIVE_LAYERS}
				cursor={clickable ? "pointer" : ""}
				onMouseMove={handleMove}
				onMouseLeave={() => useRoutingStore.getState().setHover({ airport: null, routes: [], artcc: null, source: "map" })}
				onClick={handleClick}
			>
				<MapControls
					ref={containerRef}
					position="top-right"
					initialView={INITIAL_VIEW}
					layers={layers}
					layerState={enabledLayers}
					syncLayers={setEnabledLayers}
					showFullscreen
					showReset
				/>

				{enabledLayers.has("centers") && (
					<Source id="centers" type="geojson" data={CENTERS}>
						{/* near-invisible fill: a hit target for centers that have routes */}
						<Layer id="centers-hit" type="fill" filter={filters.centerCovered} paint={{ "fill-color": "#000000", "fill-opacity": 0.01 }} />
						<Layer id="centers-selected" type="fill" filter={filters.centerSelected} paint={{ "fill-color": ENDPOINT_COLOR, "fill-opacity": 0.1 }} />
						<Layer id="centers-hover" type="fill" filter={filters.centerHover} paint={{ "fill-color": ENDPOINT_COLOR, "fill-opacity": 0.14 }} />
						<Layer id="centers-outline" type="line" paint={{ "line-color": neutral, "line-opacity": 0.2 }} />
						<Layer
							id="centers-label"
							type="symbol"
							filter={filters.centerCovered}
							layout={{
								"text-field": ["get", "IDENT"],
								"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
								"text-size": 14,
								"symbol-placement": "point"
							}}
							paint={{ "text-color": neutral, "text-opacity": 0.55 }}
						/>
					</Source>
				)}

				<Source id="routes" type="geojson" data={lines}>
					<Layer
						id="routes-line"
						type="line"
						filter={filter(["==", ["get", "complete"], true])}
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": contextColor, "line-opacity": contextOpacity, "line-width": 1.25 }}
					/>
					{/* routes with gaps (unplaced fixes) are dashed */}
					<Layer
						id="routes-line-partial"
						type="line"
						filter={filter(["==", ["get", "complete"], false])}
						layout={{ "line-cap": "butt", "line-join": "round" }}
						paint={{ "line-color": contextColor, "line-opacity": contextOpacity, "line-width": 1.25, "line-dasharray": [2, 2] }}
					/>
					<Layer id="routes-hit" type="line" paint={{ "line-color": "#000000", "line-opacity": 0.01, "line-width": 10 }} />
					<Layer
						id="routes-hover"
						type="line"
						filter={filters.routeHover}
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": typeColorExpression(), "line-opacity": 1, "line-width": 3 }}
					/>
					<Layer
						id="routes-selected-casing"
						type="line"
						filter={filters.routeSelected}
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": halo, "line-opacity": 0.9, "line-width": 7 }}
					/>
					<Layer
						id="routes-selected"
						type="line"
						filter={filters.routeSelected}
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": typeColorExpression(), "line-opacity": 1, "line-width": 4 }}
					/>
				</Source>

				{/* the overview of a big search: one arc per origin -> destination pair, wider for more routes */}
				<Source id="pairs" type="geojson" data={arcs}>
					<Layer
						id="pairs-line"
						type="line"
						layout={{ "line-cap": "round" }}
						paint={{
							"line-color": REACHABLE_COLOR,
							"line-opacity": 0.35,
							"line-width": ["interpolate", ["linear"], ["get", "count"], 1, 1, 10, 2.5, 60, 5]
						}}
					/>
					<Layer id="pairs-hit" type="line" paint={{ "line-color": "#000000", "line-opacity": 0.01, "line-width": 12 }} />
					<Layer
						id="pairs-hover"
						type="line"
						filter={filters.routeHover}
						layout={{ "line-cap": "round" }}
						paint={{ "line-color": ENDPOINT_COLOR, "line-opacity": 1, "line-width": 4 }}
					/>
				</Source>

				<Source id="fixes" type="geojson" data={fixes}>
					{/* points along a followed airway (`via`) are smaller and only labelled when zoomed in */}
					<Layer
						id="fix-points"
						type="circle"
						paint={{
							"circle-radius": ["case", ["==", ["get", "via"], ""], 3, 2],
							"circle-color": neutral,
							"circle-stroke-width": 1,
							"circle-stroke-color": halo
						}}
					/>
					<Layer
						id="fix-labels"
						type="symbol"
						filter={filter(["==", ["get", "via"], ""])}
						layout={{
							"text-field": ["get", "id"],
							"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
							"text-size": 11,
							"text-offset": [0, 0.9],
							"text-anchor": "top"
						}}
						paint={{ "text-color": neutral, "text-halo-color": halo, "text-halo-width": 1.5 }}
					/>
					<Layer
						id="fix-labels-via"
						type="symbol"
						minzoom={6}
						filter={filter(["!=", ["get", "via"], ""])}
						layout={{
							"text-field": ["get", "id"],
							"text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
							"text-size": 10,
							"text-offset": [0, 0.8],
							"text-anchor": "top"
						}}
						paint={{ "text-color": neutral, "text-opacity": 0.8, "text-halo-color": halo, "text-halo-width": 1.5 }}
					/>
				</Source>

				{enabledLayers.has("airports") && (
					<Source id="airports" type="geojson" data={airportsGeo}>
						<Layer
							id="airports-dim"
							type="circle"
							filter={filter(["==", ["get", "routes"], 0])}
							paint={{ "circle-radius": 2, "circle-color": neutral, "circle-opacity": 0.25 }}
						/>
						<Layer
							id="airports-active"
							type="circle"
							filter={filters.airportHit}
							paint={{ "circle-radius": 3.5, "circle-color": neutral, "circle-opacity": 0.75 }}
						/>
						<Layer
							id="airports-reachable"
							type="circle"
							filter={filter(["==", ["get", "reachable"], true])}
							paint={{ "circle-radius": 5, "circle-color": REACHABLE_COLOR, "circle-opacity": 0.95, "circle-stroke-width": 1, "circle-stroke-color": halo }}
						/>
						<Layer
							id="airports-hover"
							type="circle"
							filter={filters.airportHover}
							paint={{ "circle-radius": 8, "circle-color": ENDPOINT_COLOR, "circle-opacity": 0.35, "circle-stroke-width": 1.5, "circle-stroke-color": ENDPOINT_COLOR }}
						/>
						<Layer
							id="airports-selected"
							type="circle"
							filter={filters.airportSelected}
							paint={{ "circle-radius": 7, "circle-color": ENDPOINT_COLOR, "circle-opacity": 1, "circle-stroke-width": 2, "circle-stroke-color": halo }}
						/>
						<Layer id="airports-hit" type="circle" filter={filters.airportHit} paint={{ "circle-radius": 10, "circle-color": "#000000", "circle-opacity": 0.01 }} />
						<Layer
							id="airport-labels"
							type="symbol"
							filter={filters.airportLabel}
							layout={{
								"text-field": ["get", "iata"],
								"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
								"text-size": 12,
								"text-offset": [0, 1.1],
								"text-anchor": "top",
								"text-allow-overlap": true
							}}
							paint={{ "text-color": neutral, "text-halo-color": halo, "text-halo-width": 1.5 }}
						/>
					</Source>
				)}
			</Map>
		</div>
	);
};
