import axios from "axios";

import { z } from "zod/v4";
import { load } from "cheerio";
import { padZero } from "~/utils";
import { base, iataInput } from "~/utils";
import { cache } from "~/middleware/cache";

import {
	AirportExtendable,
	injectAirportByIata
} from "~/middleware/airport-by-iata";

import {
	Rvr,
	RvrProbeValue,
	RvrTrend
} from "~/schemas/airport";

type RawProbeType =
	| "touchdown"
	| "midpoint"
	| "rollout"
	| "illumination_edge"
	| "illumination_center";

const RawProbeTypeLookup: Record<RawProbeType, number> = {
	touchdown: 1,
	midpoint: 2,
	rollout: 3,
	illumination_edge: 4,
	illumination_center: 5
}

const FAULT = -1;

type AirportWithRunways = AirportExtendable<{
	include: { runways: true }
}>

export const rvr = base
	.input(iataInput)
	.use(cache<
		z.infer<typeof iataInput>,
		z.infer<typeof Rvr>
	>(
		({ iata_code }) => `__airport:${iata_code}:rvr`,
		"30 minutes",
		Rvr
	))
	.use(injectAirportByIata<AirportWithRunways>(iata_code => ({
		where: { iata_code },
		include: { runways: true }
	})))
	.handler(async ({ context: { airport } }) => {
		if (!airport.supports_rvr) return {
			iata: airport.iata_code!,
			updatedAt: Date.now(),
			runways: airport.runways.map(rwy => ({
				name: padZero(rwy.le_ident!),
				illumination: {}
			}))
		};
		
		return axios
			.get("https://rvr.data.faa.gov/cgi-bin/nph-rcrp", {
				params: {
					content: "table",
					airport: airport.iata_code!,
					rrate: "slow",
					layout: "3x3",
					gifsize: "small",
					fontsize: "1",
					cache_this: "ct" + Date.now()
				}
			})
			.then(res => res.data)
			.then(load)
			.then($ => [...$("table tr").slice(2)]
				.map(e => [...$(e).find("th, td")]
					.map(e => $(e).text().trim()))
			)
			.then(rows => ({
				iata: airport.iata_code!,
				updatedAt: Date.now(),
				runways: rows.map(rwy => ({
					name: rwy[0],
					touchdown: parseRunwayProbe(rwy, "touchdown"),
					midpoint: parseRunwayProbe(rwy, "midpoint"),
					rollout: parseRunwayProbe(rwy, "rollout"),
					illumination: {
						edge: parseIlluminationValue(rwy, "illumination_edge"),
						center: parseIlluminationValue(rwy, "illumination_center")
					}
				}))
			}))
	})

const parseRunwayProbe = (rows: string[], target: RawProbeType): z.infer<typeof RvrProbeValue> | undefined => {
	const index = RawProbeTypeLookup[target];
	const probe = rows[index]?.trim();

	// check for missing
	const value = parseProbeValue(probe);
	if (!value) return undefined;

	return {
		trend: detectTrend(probe),
		visibilityFt: value
	};
}

const parseProbeValue = (probeValue: string): number | undefined => {
	// missing
	if (!probeValue) return undefined;

	// fault
	if (probeValue === "FFF") return FAULT;

	// only time ">" shows up is for ">6000", which is maxxed out value
	if (probeValue.startsWith(">")) return 6001;

	const trend = detectTrend(probeValue);

	// no unicodes, safe to parse
	if (trend === "steady") return parseInt(probeValue);

	// strip the trend unicode arrow and parse it
	return parseInt(probeValue.slice(0, -1).trim());
}

const parseIlluminationValue = (rows: string[], target: RawProbeType): number | undefined => {
	const index = RawProbeTypeLookup[target];
	const value = rows[index]?.trim();

	// missing
	if (!value) return undefined;

	// fault
	if (value === "F") return FAULT;

	// try parsing, fallback to fault
	return parseInt(value) || FAULT;
}

const detectTrend = (probeValue: string): z.infer<typeof RvrTrend> => {
	if (probeValue.match(/^>{0,1}[0-9]+$/)) return "steady";
	if (probeValue.includes('▲')) return "increasing";
	if (probeValue.includes('▼')) return "decreasing";
	return "steady" // ?
}