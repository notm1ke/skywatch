import type { gateway } from "~/lib/gateway";
import type { ExpressionSpecification } from "mapbox-gl";
import { TFR_TYPES, placeOf, typeInfo } from "./types";

// Response types come from the gateway so they can't drift from the endpoint.
export type TfrOverview = Awaited<ReturnType<typeof gateway.airspace.tfrs.overview>>;
export type TfrRecord = TfrOverview["tfrs"][number];
export type TfrItem = TfrOverview["shapes"]["items"][number];
export type TfrPolygon = TfrOverview["shapes"]["features"][number];

type Position = [number, number];

export type TfrIndex = {
	/** every outline, as the map draws it */
	polygons: TfrOverview["shapes"];
	/** one dot per TFR that has an outline: the only thing you can see of a small one from far away */
	dots: {
		type: "FeatureCollection";
		features: Array<{
			type: "Feature";
			properties: { id: string; type: string; place: string };
			geometry: { type: "Point"; coordinates: Position };
		}>;
	};
	/** the TFR behind an id: the table's row */
	records: Map<string, TfrRecord>;
	/** where a TFR is on the map. Not every TFR has an outline. */
	items: Map<string, TfrItem>;
	/** a TFR's outlines, for picking one out */
	outlines: Map<string, TfrPolygon[]>;
	/** the size of a TFR's bounding box: a click on overlapping outlines opens the smallest */
	area: Map<string, number>;
	/** how many of each type, the biggest first: from every TFR, so the numbers stay put while types are switched off */
	counts: Array<[string, number]>;
};

const EMPTY: TfrOverview = {
	tfrs: [],
	shapes: { type: "FeatureCollection", features: [], items: [] }
};

export const buildIndex = (overview: TfrOverview = EMPTY): TfrIndex => {
	const records = new Map(overview.tfrs.map(tfr => [tfr.notam_id, tfr]));
	const items = new Map(overview.shapes.items.map(item => [item.id, item]));
	const outlines = new Map<string, TfrPolygon[]>();
	const counts = new Map<string, number>();

	for (const feature of overview.shapes.features) {
		const list = outlines.get(feature.properties.id) ?? [];
		list.push(feature);
		outlines.set(feature.properties.id, list);
	}

	for (const tfr of overview.tfrs) counts.set(tfr.type, (counts.get(tfr.type) ?? 0) + 1);

	return {
		polygons: overview.shapes,
		dots: {
			type: "FeatureCollection",
			features: overview.shapes.items.map(item => ({
				type: "Feature" as const,
				properties: { id: item.id, type: item.type, place: placeOf(records.get(item.id)?.description ?? "") },
				geometry: { type: "Point" as const, coordinates: item.center }
			}))
		},
		records,
		items,
		outlines,
		area: new Map(overview.shapes.items.map(({ id, bounds: [west, south, east, north] }) => [id, (east - west) * (north - south)])),
		counts: [...counts.entries()].sort((a, b) => b[1] - a[1])
	};
};

// ---------------------------------------------------------------------------------------------
// Paint

const FALLBACK = typeInfo("").color;

/** a type's color, for a layer whose features carry their `type` */
export const colorExpression = (): ExpressionSpecification => [
	"match", ["get", "type"],
	...TFR_TYPES.flatMap(type => [type.value, type.color]),
	FALLBACK
] as ExpressionSpecification;

/**
 * A ring around each TFR stands in for its outline while that's too small to see (a stadium's is a speck at the scale of
 * the country). The ring is a fixed size on screen; it's gone by the time you're zoomed in far enough for the real
 * outline to be a shape you can point at, at about the same size as the ring.
 */
export const RING_RADIUS: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 3, 6, 7, 8, 10, 10];
export const DOT_OPACITY: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 3, 0.95, 7.5, 0.9, 9, 0];

/** is the TFR (by bounding box) at all inside the map's view? Both are [west, south, east, north]. */
export const intersects = (a: readonly number[], b: readonly number[]) =>
	a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
