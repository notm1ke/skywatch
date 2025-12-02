import axios from "axios";

import { load } from "cheerio";
import { Effect } from "effect";
import { redis } from "~/lib/redis";
import { prisma } from "~/lib/prisma";
import { FatalError, sleep } from "workflow";
import { RvrResponse, RvrRunwayProbeValue } from "~/lib/rvr";

export async function airportRvrCron(once: boolean) {
	"use workflow";

	if (once) {
		const info = await fetchRvrInfo();
		await commit(info);
		return;
	}

	console.log("Airport RVR sync task scheduled.");
	while (true) {
		const info = await fetchRvrInfo();
		await commit(info);
		sleep("15 minutes");
	}
}

type ProbeType =
	| "touchdown"
	| "midpoint"
	| "rollout"
	| "illumination_edge"
	| "illumination_center";

const ProbeTypeLookup: Record<ProbeType, number> = {
	touchdown: 1,
	midpoint: 2,
	rollout: 3,
	illumination_edge: 4,
	illumination_center: 5
}

const FAULT = -1;

const parseRunwayProbe = (rows: string[], target: ProbeType): RvrRunwayProbeValue | undefined => {
	const index = ProbeTypeLookup[target];
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

const parseIlluminationValue = (rows: string[], target: ProbeType): number | undefined => {
	const index = ProbeTypeLookup[target];
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

async function fetchRvrInfo(): Promise<Array<RvrResponse | null>> {
	"use step";

	const tracked = await prisma
		.airport
		.findMany({
			select: { iata_code: true },
			where: { supports_rvr: true }
		})
		.then(result => result
			.map(({ iata_code }) => iata_code)
			.filter(Boolean) as string[]
		);

	const client = axios.create({ baseURL: 'https://rvr.data.faa.gov/cgi-bin' });
	const tasks = Effect.all(
		tracked.map(iata => Effect.promise(
			() => client
				.get('/nph-rcrp', {
					params: {
						content: "table",
						airport: iata,
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
					iata, updatedAt: Date.now(), runways: rows.map(rwy => ({
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
				.catch(err => {
					console.error(`Error reading RVR data for ${iata}:`, err);
					return null;
				})
		)),
		{ concurrency: 2 }
	);

	const probes = await Effect.runPromise(tasks);
	if (!probes.length) throw new FatalError(
		"Upstream API error"
	);

	return probes;
}

async function commit(info: Array<RvrResponse | null>) {
	"use step";

	const txn = redis.multi();
	info.forEach(entry => {
		if (entry) txn.set(
			`airport:${entry.iata}:rvr`,
			JSON.stringify(entry)
		);
	});

	await txn.exec();
}
