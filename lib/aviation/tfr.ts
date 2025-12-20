"use server";

import axios from "axios";

import { redis } from "../redis";
import { GeoJson } from "../geo";
import { okAsync } from "../actions";
import { safeParseJson } from "../utils";

export type Tfr = {
	notam_id: string;
	facility: string;
	state: string;
	type: string;
	dscription: string;
	mod_date: string;
	mod_abs_time: string;
	is_new: string;
	gid: string | null;
}

type TfrFeatureMetadata = {
	GID: number;
	CNS_LOCATION_ID: string;
	NOTAM_KEY: string;
	TITLE: string;
	LAST_MODIFICATION_DATETIME: string;
	STATE: string;
	LEGAL: string;
}

export type TfrGeoJson = GeoJson<
	TfrFeatureMetadata,
	"Polygon",
	Array<Array<[number, number]>>
>;

export type TfrResponse = {
	tfrs: Tfr[];
	geo: TfrGeoJson;
};

const TfrDataValidityPeriod = 60 * 2;

export const fetchTfrsAndGeo = async () => okAsync(
	Promise
		.all([fetchTfrs(), fetchTfrGeos()])
		.then(([tfrs, geo]) => ({ tfrs, geo })),
	() => "Error retrieving TFRs from upstream"
);

const fetchTfrs = async () => redis
	.get("airspace:tfr")
	.then(raw => {
		if (raw) return safeParseJson<Tfr[]>(raw) ?? [];
		
		return axios
			.get<Tfr[]>("https://tfr.faa.gov/tfrapi/getTfrList")
			.then(res => res.data)
			.then(data => {
				redis.set(
					"airspace:tfr",
					JSON.stringify(data),
					"EX", TfrDataValidityPeriod
				);
				
				return data;
			});
	})

const fetchTfrGeos = async () => redis
	.get("airspace:tfr:geo")
	.then(raw => {
		if (raw) return safeParseJson<TfrGeoJson>(raw) ?? {
			type: "FeatureCollection",
			features: [] as TfrGeoJson["features"]
		};
		
		const apiUrl = new URL("https://tfr.faa.gov/geoserver/TFR/ows");
		apiUrl.searchParams.set("service", "WFS");
		apiUrl.searchParams.set("version", "1.1.0");
		apiUrl.searchParams.set("request", "GetFeature");
		apiUrl.searchParams.set("typeName", "TFR:V_TFR_LOC");
		apiUrl.searchParams.set("maxFeatures", "300");
		apiUrl.searchParams.set("outputFormat", "application/json");
		apiUrl.searchParams.set("srsname", "EPSG:3857");
		
		return axios
			.get<TfrGeoJson>(apiUrl.toString())
			.then(res => res.data)
			.then(data => {
				redis.set(
					"airspace:tfr:geo",
					JSON.stringify(data),
					"EX", TfrDataValidityPeriod
				);
				
				return data;
			});		
	})