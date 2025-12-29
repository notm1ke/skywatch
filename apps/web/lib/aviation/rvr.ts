"use server";

import axios from "axios";

import { load } from "cheerio";
import { redis } from "../redis";
import { prisma } from "../prisma";
import { ok, okAsync, raise } from "../actions";
import { padZero, safeParseJson } from "../utils";

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

export type RvrRunwayProbeValue = {
	/**
	 * -1 = Fault, 0-6000 ft, 6001 = Maxxed out
	 */
	visibilityFt: number;
	trend: "increasing" | "decreasing" | "steady";
}

export type RvrProbe = {
	name: string;
	touchdown?: RvrRunwayProbeValue;
	midpoint?: RvrRunwayProbeValue;
	rollout?: RvrRunwayProbeValue;
	illumination: {
		/**
	 * -1 = Fault, 0 = Off, 5 = Maximum, undefined = No Lighting
	 */
		edge?: number;
		/**
	 * -1 = Fault, 0 = Off, 5 = Maximum, undefined = No Lighting
	 */
		center?: number;
	}
}

export type RvrProbeType =
	| "touchdown"
	| "midpoint"
	| "rollout"

const FAULT = -1;
const RvrResponeValidityPeriod = 60 * 30;
	
export type RvrResponse = {
	iata: string;
	updatedAt: number;
	runways: Array<RvrProbe>;
}

export const fetchRvrForAirport = async (iata_code: string) => {
	const airport = await prisma.airport.findFirst({
		where: { iata_code },
		include: { runways: true }
	});
	
	if (!airport) return raise("Airport not found");
	if (!airport?.supports_rvr) return ok<RvrResponse>({
		iata: airport.iata_code!,
		updatedAt: Date.now(),
		runways: airport.runways.map(rwy => ({
			name: padZero(rwy.le_ident!),
			illumination: {}
		}))
	});
	
	return okAsync(
		redis.get(`airport:${airport.iata_code!}:rvr`)
			.then(async raw => {
				if (raw) return safeParseJson<RvrResponse>(raw);
				return axios
					.get('https://rvr.data.faa.gov/cgi-bin/nph-rcrp', {
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
					.then(data => {
						if (!data) throw new Error("Invalid response from upstream");
						return data;
					})
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
					.then(probes => {
						redis.set(
							`airport:${airport.iata_code!}:rvr`,
							JSON.stringify(probes),
							"EX", RvrResponeValidityPeriod
						);
						
						return probes;
					});
			}),
		err => err.message ?? "Unknown error"
	);
}

const parseRunwayProbe = (rows: string[], target: RawProbeType): RvrRunwayProbeValue | undefined => {
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

const detectTrend = (probeValue: string): RvrRunwayProbeValue["trend"] => {
	if (probeValue.match(/^>{0,1}[0-9]+$/)) return "steady";
	if (probeValue.includes('▲')) return "increasing";
	if (probeValue.includes('▼')) return "decreasing";
	return "steady" // ?
}