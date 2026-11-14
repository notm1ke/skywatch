import axios from "axios";
import path from "node:path";

import { parse } from "csv-parse/sync";
import { existsSync } from "node:fs";
import { prisma } from "@/services/prisma";
import { readFile, writeFile } from "node:fs/promises";
import { PreferredRouteUpsertArgs } from "../generated/models";
import { cleanupTemp, createTemp, CsvParseOptions } from "./util";

type PreferredRouteCsvRow = {
	Orig: string;
	'Route String': string;
	Dest: string;
	Hours1: string;
	Hours2: string;
	Hours3: string;
	Type: string;
	Area: string;
	Altitude: string;
	Aircraft: string;
	Direction: string;
	Seq: string;
	DCNTR: string; 
	ACNTR: string;
}

type TrackedAirport = {
	iata: string;
	artcc: string;
}

const BATCH_SIZE = 250;
const MAX_STALE_RATIO = 0.5;
const CLEANUP_BATCH_SIZE = 1000;

const orNull = (value: string | undefined) => value ? value : null;

const routeKey = (origin_iata: string, dest_iata: string, route_type: string, sequence: number) =>
	`${origin_iata}|${dest_iata}|${route_type}|${sequence}`;

const transformPreferredRoute = (
	row: PreferredRouteCsvRow,
	origin: TrackedAirport,
	dest: TrackedAirport,
	sequence: number
): PreferredRouteUpsertArgs => {
	const fields = {
		route_string: row["Route String"],
		origin_artcc: origin.artcc,
		dest_artcc: dest.artcc,
		hour_1: orNull(row.Hours1),
		hour_2: orNull(row.Hours2),
		hour_3: orNull(row.Hours3),
		area: orNull(row.Area),
		aircraft: orNull(row.Aircraft),
		altitude: orNull(row.Altitude),
		direction: orNull(row.Direction),
	};

	return {
		where: {
			origin_iata_dest_iata_route_type_sequence: {
				origin_iata: origin.iata,
				dest_iata: dest.iata,
				route_type: row.Type,
				sequence,
			}
		},
		create: {
			...fields,
			origin_iata: origin.iata,
			dest_iata: dest.iata,
			route_type: row.Type,
			sequence,
		},
		update: fields
	};
};

export const seedPreferredRoutes = async () => {
	const start = Date.now();
	const url = "https://www.fly.faa.gov/rmt/data_file/prefroutes_db.csv";
	console.log("[prefroutes] Attempting to retrieve preferred routes from FAA:", url);
	
	const handle = await createTemp('prefroutes');
	const downloaded = await axios
		.get(url, { responseType: "arraybuffer" })
		.then(res => res.data)
		.then(async buf => {
			const target = path.join(handle, "list.csv");
			await writeFile(target, buf).then(() => console.log("[prefroutes] Preferred routes database downloaded to disk.."));
			return true;
		})
		.catch(err => {
			console.error("[prefroutes] Error retrieving preferred routes from FAA:", err.response ?? err.message ?? err);
			return false;
		});
	
	if (!downloaded) return process.exit(-1);
	const csvPath = path.join(handle, "list.csv");
	if (!existsSync(csvPath)) {
		console.error("[prefroutes] Error retrieving preferred routes database from local disk. Aborting.")
		return { result: "Error" };
	}
	
	const csv = await readFile(csvPath, { encoding: "utf8" }).catch(() => null);
	if (!csv) {
		console.error("[faa] Error reading CSV contents.");
		return { result: "Error" }
	}

	const airports = await prisma
		.airport
		.findMany({ select: { iata_code: true, local_code: true, artcc: true } })
		.then(results => results.filter(airport => airport.artcc));

	const tracked = new Map<string, TrackedAirport>();
	for (const airport of airports) {
		tracked.set(airport.iata_code, { iata: airport.iata_code, artcc: airport.artcc });
	}

	for (const airport of airports) {
		if (!airport.local_code || tracked.has(airport.local_code)) continue;
		tracked.set(airport.local_code, { iata: airport.iata_code, artcc: airport.artcc });
	}

	const opts: CsvParseOptions<PreferredRouteCsvRow> = {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		bom: true
	}

	const rows = parse<PreferredRouteCsvRow>(csv, opts);
	const data = rows.flatMap(row => {
		const origin = tracked.get(row.Orig);
		const dest = tracked.get(row.Dest);
		const sequence = parseInt(row.Seq);
		if (!origin || !dest || !Number.isInteger(sequence)) return [];
		return [transformPreferredRoute(row, origin, dest, sequence)];
	});

	console.log(`[prefroutes] Writing ${data.length} routes to the database..`);

	for (let i = 0; i < data.length; i += BATCH_SIZE) {
		const batch = data.slice(i, i + BATCH_SIZE);
		await prisma.$transaction(batch.map(
			payload => prisma.preferredRoute.upsert(payload)
		));
	}

	const seen = new Set(data.map(({ create }) => routeKey(
		create.origin_iata,
		create.dest_iata,
		create.route_type,
		create.sequence
	)));
	
	const existing = await prisma.preferredRoute.findMany({
		select: {
			route_id: true,
			origin_iata: true,
			dest_iata: true,
			route_type: true,
			sequence: true
		}
	});

	const stale = existing.filter(route => !seen.has(routeKey(
		route.origin_iata,
		route.dest_iata,
		route.route_type,
		route.sequence
	)));

	const ratioHit = stale.length / existing.length > MAX_STALE_RATIO;
	if (stale.length > 0 && ratioHit) console.warn(`[prefroutes] ${stale.length} of ${existing.length} routes appear stale - more than ${MAX_STALE_RATIO * 100}% of the table. Skipping cleanup.`);
	else if (stale.length > 0) {
		for (let i = 0; i < stale.length; i += CLEANUP_BATCH_SIZE) {
			await prisma.preferredRoute.deleteMany({
				where: { route_id: { in: stale.slice(i, i + CLEANUP_BATCH_SIZE).map(route => route.route_id) } }
			});
		}

		console.log(`[prefroutes] Removed ${stale.length} routes that are no longer in the FAA file.`);
	}

	await cleanupTemp(handle);
	console.log(`[prefroutes] Done in ${Date.now() - start}ms.`)
}