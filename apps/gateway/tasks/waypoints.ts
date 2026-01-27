import axios from "axios";
import path from "node:path";
import unzipper from "unzipper";
import moment from "moment-timezone";

import { load } from "cheerio";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { defineTask } from "nitro/task";
import { randomUUID } from "node:crypto";
import { prisma } from "@/services/prisma";
import { WaypointCreateInput } from "@/prisma/generated/models";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const DEV_DISABLED = process.env.DEV_DISABLE_SCHEDULED_TASKS;

const createTemp = async () => {
	const dir = path.join(tmpdir(), `skywatch-waypoints-${randomUUID()}`);
	await mkdir(dir);
	return dir;
}

const cleanupTemp = async (path: string) => rm(path, { recursive: true });

const extractArchive = async (archive: string, path: string, concurrency = 5) => unzipper
	.Open
	.file(archive)
	.then(handle => handle.extract({ path, concurrency }));

type RawWaypoint = {
	EFF_DATE: string;
	FIX_ID: string;
	ICAO_REGION_CODE: string;
	STATE_CODE: string;
	COUNTRY_CODE: string;
	LAT_DEG: string;
	LAT_MIN: string;
	LAT_SEC: string;
	LAT_HEMIS: string;
	LAT_DECIMAL: string;
	LON_DEG: string;
	LON_MIN: string;
	LON_SEC: string;
	LON_HEMIS: string;
	LONG_DECIMAL: string;
	FIX_ID_OLD: string;
	CHARTING_REMARK: string;
	FIX_USE_CODE: string;
	ARTCC_ID_HIGH: string;
	ARTCC_ID_LOW: string;
	PITCH_FLAG: string;
	CATCH_FLAG: string;
	SUA_ATCAA_FLAG: string;
	MIN_RECEP_ALT: string;
	COMPULSORY: string;
	CHARTS: string;
}

export const transformWaypoint = (raw: RawWaypoint): WaypointCreateInput | null => {
	const payload: WaypointCreateInput = {
		waypoint_id: raw.FIX_ID,
		waypoint_use_code: raw.FIX_USE_CODE.trim(),
		effective_date: raw.EFF_DATE,
		icao_region_code: raw.ICAO_REGION_CODE,
		country_code: raw.COUNTRY_CODE,
		state_code: raw.STATE_CODE,
		latitude_deg: parseFloat(raw.LAT_DECIMAL),
		longitude_deg: parseFloat(raw.LONG_DECIMAL),
		charts: raw.CHARTS.split(","),
		charting_remark: raw.CHARTING_REMARK,
		compulsory: raw.COMPULSORY,
		artcc_id_high: raw.ARTCC_ID_HIGH,
		artcc_id_low: raw.ARTCC_ID_LOW,
		min_reception_alt: parseInt(raw.MIN_RECEP_ALT.trim()) || -1, // -1 = None
		pitch_flag: raw.PITCH_FLAG === "Y",
		catch_flag: raw.CATCH_FLAG === "Y",
		special_use_flag: raw.SUA_ATCAA_FLAG === "Y"
	};
	
	if (!payload.waypoint_id || isNaN(payload.latitude_deg) || isNaN(payload.longitude_deg)) {
		return null;
	}
	
	return payload;
}

const waypoints = defineTask({
	meta: {
		name: "waypoints",
		description: "Pulls down current waypoint records from FAA's NASR 28 day subscription"
	},
	async run() {
		if (process.env.NODE_ENV === "development" && DEV_DISABLED === 'true') {
			console.warn('Skipped waypoint update task due to environment config.')
			return { result: "Skipped" };
		}
		
		const start = Date.now();
		const base = "https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/";
		const effectivePage = await axios
			.get(base)
			.then(res => res.data)
			.then(load)
			.then($ => $('#content > ul:nth-child(4) > li > a').attr("href"))
			.then(segment => base + segment)
			.catch(error => console.error("[waypoints] Error retrieving NASR subscription page", error.message));
		
		if (!effectivePage) return { result: "Upstream error" };
		const effectiveDate = await axios
			.get(effectivePage)
			.then(res => res.data)
			.then(load)
			.then($ => $('.pageTitle').text().split('Effective ')[1])
			.catch(err => console.error("[waypoints] Error retrieving current subscription data:", err.message));
		
		if (!effectiveDate) return { result: "Upstream error" };
		const nextUpdate = moment(effectiveDate, 'MMMM DD, YYYY').add(28, 'days');
		console.log(`[waypoints] Effective date: ${effectiveDate}, next update: ${nextUpdate.format('MMMM DD, YYYY')}`);
		
		const dataUrl = `https://nfdc.faa.gov/webContent/28DaySub/extra/${moment(effectiveDate, "MMMM DD, YYYY").format('DD_MMM_YYYY')}_CSV.zip`;
		console.log("[waypoints] Attempting to retrieve waypoints from FAA:", dataUrl);
		
		const handle = await createTemp();
		const downloaded = await axios
			.get(dataUrl, { responseType: "arraybuffer" })
			.then(res => res.data)
			.then(async buf => {
				const target = path.join(handle, "data.zip");
				await writeFile(target, buf).then(() => console.log("[waypoints] Waypoint dump downloaded to disk.."));
				await extractArchive(target, handle).then(() => console.log("[waypoints] Successfully extracted waypoints from ZIP archive."));
				return true;
			})
			.catch(err => {
				console.error("[waypoints] Error retrieving or processing waypoints from FAA:", err.response ?? err.message ?? err);
				return false;
			});
		
		if (!downloaded) return {
			result: "Error"
		};
		
		const csvPath = path.join(handle, "FIX_BASE.csv");
		if (!existsSync(csvPath)) {
			console.error("[waypoints] FAA data did not contain FIX_BASE dump. Aborting.")
			return { result: "Error" };
		}
		
		const csv = await readFile(csvPath, { encoding: "utf8" }).catch(() => null);
		if (!csv) {
			console.error("[waypoints] Error reading CSV contents.");
			return { result: "Error" }
		}
		
		const data = parse<RawWaypoint>(csv, { columns: true, skip_empty_lines: true })
			.map(transformWaypoint)
			.filter(Boolean) as WaypointCreateInput[];
		
		console.log(`[waypoints] Discovered ${data.length} waypoints - saving to database..`)
		
		await prisma.waypoint.deleteMany();
		let created = 0;
		for (let i = 0; i < data.length; i += 25000) {
			const batch = data.slice(i, i + 25000);
			const result = await prisma.waypoint.createMany({ data: batch });
			created += result.count;
		}
		
		if (created < data.length) console.warn(
			`[waypoints] ${created} waypoint${created === 1 ? '' : 's'} generated (${(created / data.length).toFixed(1)}% loss).`
		);
		
		await cleanupTemp(handle);
		
		console.log(`[waypoints] Done in ${Date.now() - start}ms.`)
		return { result: "Success" };
	}
})

export default waypoints;