import Boundaries from "~/geojson/airspaces.json";

import { gateway } from "~/lib/gateway";
import type { ExpressionSpecification } from "mapbox-gl";
import type { AirportWithJoins } from "@skywatch/gateway/schemas";

// Response types come from the gateway so they can't drift from the endpoints.
export type SearchResult = Awaited<ReturnType<typeof gateway.airspace.routing.search>>;
export type RouteResult = SearchResult["routes"][number];
export type Coverage = Awaited<ReturnType<typeof gateway.airspace.routing.coverage>>;

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
			properties: { id: route.id, type: route.type, complete: route.complete },
			geometry: {
				type: "LineString" as const,
				coordinates: route.fixes.map(fix => [fix.lon, fix.lat] as Position)
			}
		}))
});

/** Markers for the fixes along one route (the selected one). */
export const fixPoints = (route: RouteResult | undefined): Collection<{ type: "Point"; coordinates: Position }, { id: string; kind: string }> => ({
	type: "FeatureCollection",
	features: (route?.fixes ?? []).map(fix => ({
		type: "Feature" as const,
		properties: { id: fix.id, kind: fix.kind },
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
