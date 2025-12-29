import axios from "axios";

import { base } from "~/utils";
import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { cache } from "~/middleware/cache";

import {
	TfrResponse,
	Tfr,
	TfrGeoJson,
	TfrText
} from "~/schemas/faa";

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

const getTfrList = async () => axios
	.get("https://tfr.faa.gov/tfrapi/getTfrList")
	.then(res => res.data)
	.then(Tfr.safeParse);

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
		.then(TfrGeoJson.safeParse);
}

const tfrTextInput = z.object({
	notam_id: z.string()
});

const TfrTextResponse = z.array(z.object({
	notam_id: z.string(),
	text: z.string()
}));

const details = base
	.input(z.object({
		notam_id: z.string()
	}))
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
	active, details
}