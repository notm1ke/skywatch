import type { gateway } from "~/lib/gateway";
import type { ExpressionSpecification } from "mapbox-gl";
import { WAYPOINT_TYPES, airwayColor } from "./types";

// Response types come from the gateway so they can't drift from the endpoints.
export type MapPoint = Awaited<ReturnType<typeof gateway.airspace.waypoints.points>>[number];
export type Usage = Awaited<ReturnType<typeof gateway.airspace.waypoints.usage>>;

type Position = [number, number];
type Feature<Geometry, Props> = { type: "Feature"; properties: Props; geometry: Geometry };
type Collection<Geometry, Props> = { type: "FeatureCollection"; features: Feature<Geometry, Props>[] };

const FALLBACK_COLOR = "#94a3b8";

// ---------------------------------------------------------------------------------------------
// The waypoints

export type WaypointIndex = {
	/** every waypoint, as the map draws it */
	collection: Collection<{ type: "Point"; coordinates: Position }, { id: string; t: string }>;
	/** for flying to one, whether or not the panel has loaded it */
	coords: Map<string, Position>;
	types: Map<string, string>;
	/** how many of each type, most first */
	counts: Array<[string, number]>;
};

export const buildIndex = (points: MapPoint[]): WaypointIndex => {
	const coords = new Map<string, Position>();
	const types = new Map<string, string>();
	const counts = new Map<string, number>();

	const features = points.map(([id, type, lng, lat]) => {
		coords.set(id, [lng, lat]);
		types.set(id, type);
		counts.set(type, (counts.get(type) ?? 0) + 1);

		return {
			type: "Feature" as const,
			properties: { id, t: type },
			geometry: { type: "Point" as const, coordinates: [lng, lat] as Position }
		};
	});

	return {
		collection: { type: "FeatureCollection", features },
		coords,
		types,
		counts: [...counts.entries()].sort((a, b) => b[1] - a[1])
	};
};

// How big a dot is at each zoom: small enough to read the country as texture, big enough to hover when you're close.
const SIZE_AT_ZOOM: Array<[zoom: number, radius: number]> = [[3.5, 2.2], [5, 2.8], [6.5, 3.4], [8, 4.2], [10, 5], [13, 6.5]];

const sizeAt = (zoom: number) => {
	const [firstZoom, firstSize] = SIZE_AT_ZOOM[0];
	const [lastZoom, lastSize] = SIZE_AT_ZOOM[SIZE_AT_ZOOM.length - 1];
	if (zoom <= firstZoom) return firstSize;
	if (zoom >= lastZoom) return lastSize;

	for (let i = 1; i < SIZE_AT_ZOOM.length; i++) {
		const [fromZoom, fromSize] = SIZE_AT_ZOOM[i - 1];
		const [toZoom, toSize] = SIZE_AT_ZOOM[i];
		if (zoom <= toZoom) return fromSize + (toSize - fromSize) * ((zoom - fromZoom) / (toZoom - fromZoom));
	}

	return lastSize;
};

/**
 * Each type's dot size by zoom, 0 until the zoom that type starts to show at (see `appearsAt`): a type pops in rather
 * than growing from nothing over a wide range of zooms, because there's a stop on either side of that zoom.
 * `extra` makes the same shape bigger, for the invisible layer that catches the pointer.
 */
export const radiusExpression = (extra = 0): ExpressionSpecification => {
	const appearances = Object.values(WAYPOINT_TYPES).flatMap(info => [info.appearsAt - 0.01, info.appearsAt]);
	const zooms = [...new Set([...SIZE_AT_ZOOM.map(([zoom]) => zoom), ...appearances].map(zoom => Math.round(zoom * 100) / 100))]
		.sort((a, b) => a - b);

	const stops = zooms.flatMap(zoom => [
		zoom,
		[
			"match", ["get", "t"],
			...Object.entries(WAYPOINT_TYPES).flatMap(([code, info]) => [code, zoom < info.appearsAt ? 0 : sizeAt(zoom) + extra]),
			// a type we don't know about: show it once you're close
			zoom < 8 ? 0 : sizeAt(zoom) + extra
		]
	]);

	return ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;
};

export const colorExpression = (): ExpressionSpecification => [
	"match",
	["get", "t"],
	...Object.entries(WAYPOINT_TYPES).flatMap(([code, info]) => [code, info.color]),
	FALLBACK_COLOR
] as ExpressionSpecification;

// ---------------------------------------------------------------------------------------------
// The airways through the open waypoint

/** One line per airway, through every point of it we could place. */
export const airwayLines = (usage: Usage | undefined): Collection<{ type: "LineString"; coordinates: Position[] }, { id: string; color: string }> => ({
	type: "FeatureCollection",
	features: (usage?.airways ?? [])
		.filter(airway => airway.points.length >= 2)
		.map(airway => ({
			type: "Feature" as const,
			properties: { id: airway.id, color: airwayColor(airway.id) },
			geometry: {
				type: "LineString" as const,
				coordinates: airway.points.map((point): Position => [point.lon, point.lat])
			}
		}))
});
