import axios from "axios"
import path from "node:path";

import { load } from "cheerio"
import { parse } from "csv-parse/sync";
import { existsSync } from "node:fs";
import { prisma } from "@/services/prisma";
import { readFile, writeFile } from "node:fs/promises";
import { AirportUpdateArgs } from "@/prisma/generated/models";
import { cleanupTemp, createTemp, CsvParseOptions } from "./util";

type PortOfEntryCsvRow = {
	'Airport Code': string;
	'Description of Airport': string;
	'City Name': string;
	'State': string;
	'USDA Compliance Agreement in Place and Eligible for Precleared Arrivals in Place and Eligible for Precleared Arrivals': boolean;
}

const BATCH_SIZE = 100;

const transformCbpRecord = (row: PortOfEntryCsvRow): AirportUpdateArgs => ({
	where: { icao_code: row["Airport Code"] },
	data: { has_cbp: true }
});

export const seedAirportCbpPortsOfEntry = async () => {
	const start = Date.now();
	const csvLink = await axios
		.get('https://www.cbp.gov/travel/general-aviation-processing/general-aviation-airports')
		.then(res => res.data)
		.then(load)
		.then($ => $('a[title="CBP_General_Aviation_Airport_List.csv"]').attr('href'))
		.then(path => {
			if (!path) return null;
			return `https://cbp.gov/${path.slice(1)}`;
		});
	
	if (!csvLink) process.exit(-1);
	
	console.log("[cbp] Attempting to retrieve Ports of Entry from CBP:", csvLink);
	const handle = await createTemp('cbp');
	const downloaded = await axios
		.get(csvLink, { responseType: "arraybuffer" })
		.then(res => res.data)
		.then(async buf => {
			const target = path.join(handle, "list.csv");
			await writeFile(target, buf).then(() => console.log("[cbp] CBP Ports of Entry list downloaded to disk.."));
			return true;
		})
		.catch(err => {
			console.error("[cbp] Error retrieving Ports of Entry data from CBP:", err.response ?? err.message ?? err);
			return false;
		});
	
	if (!downloaded) return process.exit(-1);
	const csvPath = path.join(handle, "list.csv");
	if (!existsSync(csvPath)) {
		console.error("[cbp] Error retrieving Ports of Entry list from local disk. Aborting.")
		return { result: "Error" };
	}
	
	const csv = await readFile(csvPath, { encoding: "utf8" }).catch(() => null);
	if (!csv) {
		console.error("[cbp] Error reading CSV contents.");
		return { result: "Error" }
	}

	const tracked = await prisma
		.airport
		.findMany({ select: { icao_code: true }, distinct: ["icao_code"] })
		.then(results => new Set(...[results.map(result => result.icao_code)]));

	const filterValidIcaos = (record: PortOfEntryCsvRow) => {
		return tracked.has(record["Airport Code"])
			? record
			: null;
	}
	
	const opts: CsvParseOptions<PortOfEntryCsvRow> = {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		on_record: filterValidIcaos
	}
	
	const data = parse<PortOfEntryCsvRow>(csv, opts).map(transformCbpRecord);
	console.log(`[cbp] Discovered ${data.length} tracked airports in datapoints - saving to database..`);

	for (let i = 0; i < data.length; i += BATCH_SIZE) {
		const batch = data.slice(i, i + BATCH_SIZE);
		await prisma.$transaction(batch.map(
			payload => prisma.airport.update(payload)
		));
	}
	
	await cleanupTemp(handle);
	console.log(`[cbp] Done in ${Date.now() - start}ms.`)
};