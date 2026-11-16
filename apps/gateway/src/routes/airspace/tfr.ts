import axios from "axios";

import { z } from "zod/v4";
import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { cache } from "@/middleware/cache";

import {
	TfrResponse,
	TfrOverview,
	TfrShapes,
	Tfr,
	TfrGeoJson,
	TfrText
} from "@/schemas/faa";

const active = base
	.input(z.void())
	.use(cache(
		"__airspace:tfr",
		"2 minutes",
		TfrResponse
	))
	.handler(async () => await Promise
		.all([
			getTfrList(),
			getTfrGeoFeatures()
		])
		.then(([tfrs, geo]) => ({ tfrs, geo }))
	)

// The list and the shapes, ready for a map: see TfrShapes. A new endpoint next to `active` rather than a change to it, so
// web builds that still call `active` keep working.
const overview = base
	.input(z.void())
	.use(cache(
		"__airspace:tfr:overview",
		"2 minutes",
		TfrOverview
	))
	.handler(async () => {
		const [tfrs, geo] = await Promise.all([
			getTfrList(),
			// the list is useful without the shapes: a failure here means a table with no map, not an error page
			getTfrGeoFeatures().catch(() => null)
		]);

		return { tfrs, shapes: toShapes(tfrs, geo) };
	})

// https://epsg.io/3857 -> https://epsg.io/4326
const WEB_MERCATOR_EXTENT = 20037508.34;

// four decimals is about 10 metres: plenty for an outline on a map of the whole country
const round = (value: number) => Math.round(value * 1e4) / 1e4;

const toLngLat = ([x, y]: number[]): [number, number] => [
	round((x * 180) / WEB_MERCATOR_EXTENT),
	round((Math.atan(Math.exp((y * Math.PI) / WEB_MERCATOR_EXTENT)) * 360) / Math.PI - 90)
];

const toShapes = (
	tfrs: z.infer<typeof Tfr>[],
	geo: z.infer<typeof TfrGeoJson> | null
): z.infer<typeof TfrShapes> => {
	const types = new Map(tfrs.map(tfr => [tfr.notam_id, tfr.type]));
	const bounds = new Map<string, [number, number, number, number]>();
	const features: z.infer<typeof TfrShapes>["features"] = [];

	for (const feature of geo?.features ?? []) {
		// a NOTAM key is "6/7601-1-FDC-F": the id is the part before the first dash
		const id = feature.properties.NOTAM_KEY.split("-")[0];
		const type = types.get(id);
		if (!type) continue;

		const coordinates = feature.geometry.coordinates.map(ring => ring.map(toLngLat));
		features.push({
			type: "Feature",
			properties: { id, type },
			geometry: { type: "Polygon", coordinates }
		});

		// one NOTAM can have several polygons: its bounds cover all of them
		const box = bounds.get(id) ?? [Infinity, Infinity, -Infinity, -Infinity];
		for (const [lng, lat] of coordinates.flat()) {
			box[0] = Math.min(box[0], lng);
			box[1] = Math.min(box[1], lat);
			box[2] = Math.max(box[2], lng);
			box[3] = Math.max(box[3], lat);
		}
		bounds.set(id, box);
	}

	const items = [...bounds.entries()].map(([id, box]) => ({
		id,
		type: types.get(id) ?? "",
		center: [round((box[0] + box[2]) / 2), round((box[1] + box[3]) / 2)] as [number, number],
		bounds: box
	}));

	return { type: "FeatureCollection", features, items };
}

const getTfrList = async () => axios
	.get("https://tfr.faa.gov/tfrapi/getTfrList")
	.then(res => res.data)
	.then(z.array(Tfr).safeParse)
	.then(parsed => {
		if (!parsed.success) throw new ORPCError("UPSTREAM_ERROR", {
			message: "Error retrieving TFR data from upstream"
		});

		return parsed.data;
	});

const getTfrGeoFeatures = async () => {
	const apiUrl = new URL("https://tfr.faa.gov/geoserver/TFR/ows");
	apiUrl.searchParams.set("service", "WFS");
	apiUrl.searchParams.set("version", "1.1.0");
	apiUrl.searchParams.set("request", "GetFeature");
	apiUrl.searchParams.set("typeName", "TFR:V_TFR_LOC");
	apiUrl.searchParams.set("maxFeatures", "300");
	apiUrl.searchParams.set("outputFormat", "application/json");
	apiUrl.searchParams.set("srsname", "EPSG:3857");

	return axios
		.get(apiUrl.toString())
		.then(res => res.data)
		.then(TfrGeoJson.safeParse)
		.then(parsed => {
			if (!parsed.success) throw new ORPCError("UPSTREAM_ERROR", {
				message: "Error retrieving geospatial data from upstream"
			});

			return parsed.data;
		});
}

const tfrTextInput = z.object({
	notam_id: z.string()
});

const TfrTextResponse = z.array(z.object({
	notam_id: z.string(),
	text: z.string()
}));

const details = base
	.input(tfrTextInput)
	.use(cache<
		z.infer<typeof tfrTextInput>,
		z.infer<typeof TfrText>
	>(
		({ notam_id }) => `__airspace:tfr:${notam_id}:text`,
		"2 minutes",
		TfrText
	))
	.handler(async ({ input: { notam_id } }) => axios
		.get(`https://tfr.faa.gov/tfrapi/getWebText?notamId=${encodeURIComponent(notam_id)}`)
		.then(res => res.data)
		.then(TfrTextResponse.safeParse)
		.then(parsed => {
			if (!parsed.success) throw new ORPCError("UPSTREAM_ERROR");
			if (!parsed.data.length) throw new ORPCError("NO_DATA_ERROR", {
				message: "There are no active TFRs for this NOTAM"
			});

			const text = parsed.data.at(0)!.text;
			return { text };
		}))

export const tfrs = {
	active, overview, details
}
