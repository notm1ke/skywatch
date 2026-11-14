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
	airportPoints,
	coveredCenters,
	fixPoints,
	routeBounds,
	routeLines,
	typeColorExpression,
	type Coverage,
	type RouteResult
} from "./geo";

const INITIAL_VIEW = { latitude: 37, longitude: -97.5, zoom: 3.25 };

// the floating route list covers the left of the map on desktop
const LIST_WIDTH = 360;

const ENDPOINT_COLOR = "#f97316";
const REACHABLE_COLOR = "#0ea5e9";

// every layer a click or hover can land on
const INTERACTIVE_LAYERS = ["airports-hit", "routes-hit", "centers-hit"];

type Props = {
	/** the routes to draw (type / completeness filters already applied) */
	routes: RouteResult[];
	/** changes only when a new search result arrives (never on hover, filter toggles or placeholder data); drives auto-framing */
	frameKey: unknown;
	coverage: Coverage | undefined;
	airports: AirportWithJoins[];
};

const filter = (expression: unknown) => expression as FilterSpecification;

export const RoutingMap: React.FC<Props> = ({ routes, frameKey, coverage, airports }) => {
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
	const lines = useMemo(() => routeLines(routes), [routes]);

	const reachable = useMemo(() => {
		const codes = new Set<string>();
		for (const route of routes) {
			codes.add(route.origin);
			codes.add(route.dest);
		}

		return codes;
	}, [routes]);

	const airportsGeo = useMemo(() => airportPoints(airports, coverage, reachable), [airports, coverage, reachable]);
	const covered = useMemo(() => coveredCenters(coverage), [coverage]);
	const selectedRoute = useMemo(() => routes.find(route => route.id === selectedId), [routes, selectedId]);
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

	// --- layers toggle -----------------------------------------------------------------------------------
	const layers: MapLayers = [
		{ key: "centers", name: "Centers", color: "var(--color-zinc-500)", count: covered.length },
		{ key: "airports", name: "Airports", color: "var(--color-sky-500)", count: airportsGeo.features.filter(f => f.properties.routes > 0).length },
	];

	const [enabledLayers, setEnabledLayers] = useState<Set<string>>(() => new Set(layers.map(layer => layer.key)));

	// --- framing: only when a new result arrives ---------------------------------------------------------
	const latestRoutes = useRef(routes);
	useEffect(() => {
		latestRoutes.current = routes;
	});

	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		const bounds = frameKey ? routeBounds(latestRoutes.current) : null;
		if (!bounds) {
			if (!frameKey) map.flyTo({ center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude], zoom: INITIAL_VIEW.zoom });
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

		// routes share segments (a departure procedure, an airway), so take every one under the cursor
		const routeIds = airport
			? []
			: [...new Set(features
				.filter(feature => feature.layer?.id === "routes-hit")
				.map(feature => String(feature.properties?.id)))];

		const artcc = airport || routeIds.length
			? undefined
			: features.find(feature => feature.layer?.id === "centers-hit")?.properties?.IDENT as string | undefined;

		useRoutingStore.getState().setHover({ airport: airport ?? null, routes: routeIds, artcc: artcc ?? null });
	};

	const handleClick = (event: MapMouseEvent) => {
		const { pick, select } = useRoutingStore.getState();
		const features = event.features ?? [];

		// 1. an airport that has routes
		const airport = features.find(feature => feature.layer?.id === "airports-hit")?.properties?.iata as string | undefined;
		if (airport) return pick({ airport });

		// 2. a route
		const routeId = features.find(feature => feature.layer?.id === "routes-hit")?.properties?.id as string | undefined;
		if (routeId) return select(useRoutingStore.getState().selectedId === routeId ? null : routeId);

		// 3. with a route selected, a click on the background just deselects: almost every click lands inside
		//    some center, and picking one would fire a search that can return thousands of routes
		if (useRoutingStore.getState().selectedId) return select(null);

		// 4. otherwise a center
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
				onMouseLeave={() => useRoutingStore.getState().setHover({ airport: null, routes: [], artcc: null })}
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
						paint={{ "line-color": typeColorExpression(), "line-opacity": lineOpacity, "line-width": 1.25 }}
					/>
					{/* routes with gaps (unplaced fixes) are dashed */}
					<Layer
						id="routes-line-partial"
						type="line"
						filter={filter(["==", ["get", "complete"], false])}
						layout={{ "line-cap": "butt", "line-join": "round" }}
						paint={{ "line-color": typeColorExpression(), "line-opacity": lineOpacity, "line-width": 1.25, "line-dasharray": [2, 2] }}
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

				<Source id="fixes" type="geojson" data={fixes}>
					<Layer
						id="fix-points"
						type="circle"
						paint={{ "circle-radius": 3, "circle-color": neutral, "circle-stroke-width": 1, "circle-stroke-color": halo }}
					/>
					<Layer
						id="fix-labels"
						type="symbol"
						layout={{
							"text-field": ["get", "id"],
							"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
							"text-size": 11,
							"text-offset": [0, 0.9],
							"text-anchor": "top"
						}}
						paint={{ "text-color": neutral, "text-halo-color": halo, "text-halo-width": 1.5 }}
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
