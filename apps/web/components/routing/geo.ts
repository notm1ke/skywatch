import Boundaries from "~/geojson/airspaces.json";

import { gateway } from "~/lib/gateway";
import type { ExpressionSpecification } from "mapbox-gl";
import type { AirportWithJoins } from "@skywatch/gateway/schemas";

// Response types come from the gateway so they can't drift from the endpoints.
export type SearchResult = Awaited<ReturnType<typeof gateway.airspace.routing.search>>;
export type RouteResult = SearchResult["routes"][number];
export type Coverage = Awaited<ReturnType<typeof gateway.airspace.routing.coverage>>;
export type PairsResult = Awaited<ReturnType<typeof gateway.airspace.routing.pairs>>;
export type Pair = PairsResult["pairs"][number];

/**
 * A route's identity: the same fields as its unique key in the database. Unlike the database id it survives a
 * reseed, so it's safe to put in a URL, and it's what the map's `id` property, hover and selection all use.
 */
export const routeKey = (route: Pick<RouteResult, "origin" | "dest" | "type" | "sequence">) =>
	`${route.origin}.${route.dest}.${route.type}.${route.sequence}`;

type Position = [number, number];
type Feature<Geometry, Props> = { type: "Feature"; properties: Props; geometry: Geometry };
type Collection<Geometry, Props> = { type: "FeatureCollection"; features: Feature<Geometry, Props>[] };

// ---------------------------------------------------------------------------------------------
// Route types

export const ROUTE_TYPE_COLORS: Record<string, string> = {
	H: "#3b82f6",   // high altitude
	L: "#22c55e",   // low altitude
	TEC: "#f59e0b", // tower enroute
	NAR: "#a855f7",
	SHD: "#ec4899",
	SLD: "#f43f5e",
	HPD: "#06b6d4",
};

const FALLBACK_COLOR = "#94a3b8";

export const typeColor = (type: string) => ROUTE_TYPE_COLORS[type] ?? FALLBACK_COLOR;

/** Mapbox expression that colors a feature by its `type` property. */
export const typeColorExpression = (): ExpressionSpecification => [
	"match",
	["get", "type"],
	...Object.entries(ROUTE_TYPE_COLORS).flat(),
	FALLBACK_COLOR
] as ExpressionSpecification;

// ---------------------------------------------------------------------------------------------
// Routes

type RouteProps = { id: string; type: string; complete: boolean };

/**
 * One line per route, through every fix we could place. Routes with fewer than two placed fixes are left out
 * (they're not a valid line); they still appear in the list.
 * Build this from the search result only: rebuilding it on hover would re-upload every line to the map.
 */
export const routeLines = (routes: RouteResult[]): Collection<{ type: "LineString"; coordinates: Position[] }, RouteProps> => ({
	type: "FeatureCollection",
	features: routes
		.filter(route => route.fixes.length >= 2)
		.map(route => ({
			type: "Feature" as const,
			properties: { id: routeKey(route), type: route.type, complete: route.complete },
			geometry: {
				type: "LineString" as const,
				coordinates: route.fixes.map(fix => [fix.lon, fix.lat] as Position)
			}
		}))
});

/**
 * Markers for the fixes along one route (the selected one). Points added by following an airway carry `via`, so the
 * map can draw them smaller and label them only when zoomed in.
 */
export const fixPoints = (route: RouteResult | undefined): Collection<{ type: "Point"; coordinates: Position }, { id: string; kind: string; via: string }> => ({
	type: "FeatureCollection",
	features: (route?.fixes ?? []).map(fix => ({
		type: "Feature" as const,
		properties: { id: fix.id, kind: fix.kind, via: fix.via ?? "" },
		geometry: { type: "Point" as const, coordinates: [fix.lon, fix.lat] as Position }
	}))
});

/** [[west, south], [east, north]] around every placed fix, or null when there's nothing to frame. */
export const routeBounds = (routes: RouteResult[]): [Position, Position] | null => {
	let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;

	for (const route of routes) {
		for (const fix of route.fixes) {
			west = Math.min(west, fix.lon);
			east = Math.max(east, fix.lon);
			south = Math.min(south, fix.lat);
			north = Math.max(north, fix.lat);
		}
	}

	return Number.isFinite(west) ? [[west, south], [east, north]] : null;
};

// ---------------------------------------------------------------------------------------------
// Pairs (the overview of a big search: one arc per origin -> destination pair)

/** airport code -> [lon, lat] */
export type AirportCoords = Map<string, Position>;

export const airportCoords = (airports: AirportWithJoins[]): AirportCoords =>
	new Map(airports.map(airport => [airport.iata_code, [airport.longitude_deg, airport.latitude_deg] as Position]));

/** Points along the great circle between two positions, so arcs curve the way long flights do on a Mercator map. */
const greatCircle = (a: Position, b: Position, steps = 32): Position[] => {
	const rad = Math.PI / 180;
	const [lon1, lat1, lon2, lat2] = [a[0] * rad, a[1] * rad, b[0] * rad, b[1] * rad];
	const delta = 2 * Math.asin(Math.sqrt(
		Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
	));

	// effectively the same place: nothing to curve
	if (delta < 1e-6) return [a, b];

	const points: Position[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const k1 = Math.sin((1 - t) * delta) / Math.sin(delta);
		const k2 = Math.sin(t * delta) / Math.sin(delta);
		const x = k1 * Math.cos(lat1) * Math.cos(lon1) + k2 * Math.cos(lat2) * Math.cos(lon2);
		const y = k1 * Math.cos(lat1) * Math.sin(lon1) + k2 * Math.cos(lat2) * Math.sin(lon2);
		const z = k1 * Math.sin(lat1) + k2 * Math.sin(lat2);
		points.push([Math.atan2(y, x) / rad, Math.atan2(z, Math.sqrt(x * x + y * y)) / rad]);
	}

	return points;
};

type PairProps = { id: string; count: number };

/** One arc per pair, width driven by `count`. Pairs whose airports we have no position for are left out. */
export const pairArcs = (
	pairs: Array<Pick<Pair, "id" | "origin" | "dest"> & { count: number }>,
	coords: AirportCoords
): Collection<{ type: "LineString"; coordinates: Position[] }, PairProps> => ({
	type: "FeatureCollection",
	features: pairs.flatMap(pair => {
		const origin = coords.get(pair.origin);
		const dest = coords.get(pair.dest);
		if (!origin || !dest) return [];

		return [{
			type: "Feature" as const,
			properties: { id: pair.id, count: pair.count },
			geometry: { type: "LineString" as const, coordinates: greatCircle(origin, dest) }
		}];
	})
});

export const pairBounds = (pairs: Array<Pick<Pair, "origin" | "dest">>, coords: AirportCoords): [Position, Position] | null => {
	let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;

	for (const pair of pairs) {
		for (const code of [pair.origin, pair.dest]) {
			const position = coords.get(code);
			if (!position) continue;
			west = Math.min(west, position[0]);
			east = Math.max(east, position[0]);
			south = Math.min(south, position[1]);
			north = Math.max(north, position[1]);
		}
	}

	return Number.isFinite(west) ? [[west, south], [east, north]] : null;
};

// ---------------------------------------------------------------------------------------------
// Airports

type AirportProps = {
	iata: string;
	/** routes out of + into this airport; 0 means there's nothing to click */
	routes: number;
	/** the far end of one of the routes currently on the map */
	reachable: boolean;
};

export const airportPoints = (
	airports: AirportWithJoins[],
	coverage: Coverage | undefined,
	reachable: Set<string>
): Collection<{ type: "Point"; coordinates: Position }, AirportProps> => ({
	type: "FeatureCollection",
	features: airports.map(airport => {
		const counts = coverage?.airports[airport.iata_code];
		return {
			type: "Feature" as const,
			properties: {
				iata: airport.iata_code,
				routes: (counts?.outbound ?? 0) + (counts?.inbound ?? 0),
				reachable: reachable.has(airport.iata_code)
			},
			geometry: { type: "Point" as const, coordinates: [airport.longitude_deg, airport.latitude_deg] as Position }
		};
	})
});

// ---------------------------------------------------------------------------------------------
// ARTCCs

type CenterProps = { IDENT: string; NAME: string };

type BoundaryFeature = {
	properties: { TYPE_CODE: string; IDENT: string; NAME: string };
	geometry: { type: "Polygon"; coordinates: number[][][] };
};

/**
 * ARTCC polygons (an upper and a lower one per center), trimmed to the two properties we use.
 * Built once at module level from the same import the airspace page uses, so it stays one shared chunk.
 */
export const CENTERS: Collection<{ type: "Polygon"; coordinates: number[][][] }, CenterProps> = {
	type: "FeatureCollection",
	features: (Boundaries as unknown as { features: BoundaryFeature[] }).features
		.filter(feature => feature.properties.TYPE_CODE === "ARTCC")
		.map(feature => ({
			type: "Feature" as const,
			properties: { IDENT: feature.properties.IDENT, NAME: feature.properties.NAME },
			geometry: feature.geometry
		}))
};

/** Center codes that have at least one route; the rest (e.g. ZAN) aren't clickable. */
export const coveredCenters = (coverage: Coverage | undefined) => Object.keys(coverage?.artccs ?? {});
