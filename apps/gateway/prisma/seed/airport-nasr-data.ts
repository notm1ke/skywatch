import axios from "axios";
import path from "node:path";
import moment from "moment-timezone";

import { load } from "cheerio";
import { existsSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { prisma } from "@/services/prisma";
import { readFile, writeFile } from "node:fs/promises";
import { AirportUpdateArgs, AirwayUpsertArgs } from "@/prisma/generated/models";
import { cleanupTemp, createTemp, extractArchive } from "./util";

const BATCH_SIZE = 1000;
const CLEANUP_BATCH_SIZE = 100;

// Airway cleanup refuses to run if it would remove more than this share of the table (a bad file shouldn't wipe it).
const MAX_STALE_RATIO = 0.5;

type RawAirwayRow = {
	AWY_DESIGNATION: string;
	AWY_LOCATION: string;
	AWY_ID: string;
	REGULATORY: string;
	AIRWAY_STRING: string;
}

type RawAirportRef = {
	EFF_DATE: string;
	SITE_NO: string;
	SITE_TYPE_CODE: string;
	STATE_CODE: string;
	ARPT_ID: string;
	CITY: string;
	COUNTRY_CODE: string;
	REGION_CODE: string;
	ADO_CODE: string;
	STATE_NAME: string;
	COUNTY_NAME: string;
	COUNTY_ASSOC_STATE: string;
	ARPT_NAME: string;
	OWNERSHIP_TYPE_CODE: string;
	FACILITY_USE_CODE: string;
	/* lat,lng fields */
	SURVEY_METHOD_CODE: string;
	ELEV: number;
	ELEV_METHOD_CODE: string;
	MAG_VARN: number;
	MAG_HEMIS: string;
	MAG_VARN_YEAR: number;
	/* tpa */
	CHART_NAME: string;
	DIST_CITY_TO_AIRPORT: number;
	DIRECTION_CODE: string;
	ACREAGE: number;
	RESP_ARTCC_ID: string;
	COMPUTER_ID: string;
	ARTCC_NAME: string;
	FSS_ON_ARPT_FLAG: string;
	FSS_ID: string;
	FSS_NAME: string;
	PHONE_NO: string | null;
	TOLL_FREE_NO: string;
	ALT_FSS_ID: string | null;
	ALT_FSS_NAME: string | null;
	ALT_TOLL_FREE_NO: string | null;
	NOTAM_ID: string;
	NOTAM_FLAG: string;
	ACTIVATION_DATE: string;
	ARPT_STATUS: string;
	FAR_139_TYPE_CODE: string;
	FAR_139_CARRIER_SER_CODE: string;
	ARFF_CERT_TYPE_DATE: string;
	NASP_CODE: string;
	ASP_ANLYS_DTRM_CODE: string;
	CUST_FLAG: string;
	LNDG_RIGHTS_FLAG: string;
	JOINT_USE_FLAG: string;
	MIL_LNDG_FLAG: string;
	INSPECT_METHOD_CODE: string;
	INSPECTOR_CODE: string;
	LAST_INSPECTION: string;
	LAST_INFO_RESPONSE: string | null;
	FUEL_TYPES: string;
	AIRFRAME_REPAIR_SER_CODE: string;
	PWR_PLANE_REPAIR_SER: string;
	BOTTLED_OXY_TYPE: string;
	BULK_OXY_TYPE: string;
	LGT_SKED: string | null;
	BCN_LGT_SKED: string | null;
	TWR_TYPE_CODE: string;
	SEG_CIRCLE_MKR_FLAG: string;
	BCN_LENS_COLOR: string;
	LNDG_FEE_FLAG: string;
	MEDICAL_USE_FLAG: string | null;
	ARPT_PSN_SOURCE: string;
	POSITION_SRC_DATE: string;
	ARPT_ELEV_SOURCE: string;
	ELEVATION_SRC_DATE: string;
	CONTR_FUEL_AVBL: string | null;
	TRNS_STRG_BUOY_FLAG: string | null;
	TRNS_STRG_HGR_FLAG: string;
	TRNS_STRG_TIE_FLAG: string;
	OTHER_SERVICES: string;
	WIND_INDCR_FLAG: string;
	ICAO_ID: string;
	MIN_OP_NETWORK: string;
	USER_FEE_FLAG: string | null;
	CTA: string | null;
}

const inspectionDate = (row: RawAirportRef) => {
	const date = moment(row.LAST_INSPECTION, "yyyy/MM/DD").toDate();
	if (isNaN(date.getTime())) return null;
	return date;
}

const transformNasrRecord = (row: RawAirportRef): AirportUpdateArgs => ({
	where: { icao_code: row.ICAO_ID },
	data: {
		artcc: row.RESP_ARTCC_ID,
		fuel_types: row.FUEL_TYPES.split(","),
		fss_number: row.TOLL_FREE_NO,
		rescue_flags: row.FAR_139_TYPE_CODE.split(" "),
		nasp_flags: row.NASP_CODE.split(""),
		has_cbp: row.CUST_FLAG === "Y",
		mil_joint_use: row.JOINT_USE_FLAG === "Y",
		mil_ldg_rights: row.MIL_LNDG_FLAG === "Y",
		inspection_type: row.INSPECT_METHOD_CODE,
		inspection_date: inspectionDate(row), 
		inspector_type: row.INSPECTOR_CODE,
		atc_type: row.TWR_TYPE_CODE
	}
})

const transformAirway = (row: RawAirwayRow): AirwayUpsertArgs => {
	const fields = {
		designation: row.AWY_DESIGNATION,
		regulatory: row.REGULATORY === "Y",
		// "OAL ILC MLF SAKES ..." -> ["OAL", "ILC", "MLF", "SAKES", ...]
		points: row.AIRWAY_STRING.split(/\s+/).filter(Boolean)
	};

	return {
		where: { airway_id_location: { airway_id: row.AWY_ID, location: row.AWY_LOCATION } },
		create: { airway_id: row.AWY_ID, location: row.AWY_LOCATION, ...fields },
		update: fields
	};
};

/** Seeds airways from AWY_BASE.csv in the already extracted NASR bundle, so the bundle is only downloaded once. */
const seedAirways = async (dir: string) => {
	const csvPath = path.join(dir, "AWY_BASE.csv");
	if (!existsSync(csvPath)) {
		console.warn("[nasr] NASR data did not contain AWY_BASE.csv, skipping airways.");
		return;
	}

	const csv = await readFile(csvPath, { encoding: "utf8" }).catch(() => null);
	if (!csv) {
		console.error("[nasr] Error reading AWY_BASE.csv.");
		return;
	}

	const rows = parse<RawAirwayRow>(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true })
		.filter(row => row.AWY_ID && row.AWY_LOCATION && row.AIRWAY_STRING);

	const data = rows.map(transformAirway);
	console.log(`[nasr] Discovered ${data.length} airways - saving to database..`);

	for (let i = 0; i < data.length; i += BATCH_SIZE) {
		const batch = data.slice(i, i + BATCH_SIZE);
		await prisma.$transaction(batch.map(
			payload => prisma.airway.upsert(payload)
		));
	}

	// Airways get retired between cycles, and upserts never remove anything.
	const seen = new Set(rows.map(row => `${row.AWY_ID}|${row.AWY_LOCATION}`));
	const existing = await prisma.airway.findMany({ select: { airway_id: true, location: true } });
	const stale = existing.filter(airway => !seen.has(`${airway.airway_id}|${airway.location}`));

	if (stale.length > 0 && stale.length / existing.length > MAX_STALE_RATIO) {
		console.warn(`[nasr] ${stale.length} of ${existing.length} airways look stale, more than ${MAX_STALE_RATIO * 100}% of the table. Skipping cleanup.`);
	} else if (stale.length > 0) {
		for (let i = 0; i < stale.length; i += CLEANUP_BATCH_SIZE) {
			await prisma.airway.deleteMany({
				where: { OR: stale.slice(i, i + CLEANUP_BATCH_SIZE).map(airway => ({ airway_id: airway.airway_id, location: airway.location })) }
			});
		}

		console.log(`[nasr] Removed ${stale.length} airways that are no longer in the FAA file.`);
	}
};

export const seedAirportNasrData = async () => {
	const start = Date.now();
	const base = "https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/";
	const effectivePage = await axios
		.get(base)
		.then(res => res.data)
		.then(load)
		.then($ => $('#content > ul:nth-child(4) > li > a').attr("href"))
		.then(segment => base + segment)
		.catch(error => console.error("[nasr] Error retrieving NASR subscription page", error.message));
	
	if (!effectivePage) return process.exit(-1);
	const effectiveDate = await axios
		.get(effectivePage)
		.then(res => res.data)
		.then(load)
		.then($ => $('.pageTitle').text().split('Effective ')[1])
		.catch(err => console.error("[nasr] Error retrieving current subscription data:", err.message));
	
	if (!effectiveDate) return { result: "Upstream error" };
	const nextUpdate = moment(effectiveDate, 'MMMM DD, YYYY').add(28, 'days');
	console.log(`[nasr] Effective date: ${effectiveDate}, next update: ${nextUpdate.format('MMMM DD, YYYY')}`);
	
	const dataUrl = `https://nfdc.faa.gov/webContent/28DaySub/extra/${moment(effectiveDate, "MMMM DD, YYYY").format('DD_MMM_YYYY')}_CSV.zip`;
	console.log("[nasr] Attempting to retrieve NASR data from FAA:", dataUrl);
	
	const handle = await createTemp('nasr');
	const downloaded = await axios
		.get(dataUrl, { responseType: "arraybuffer" })
		.then(res => res.data)
		.then(async buf => {
			const target = path.join(handle, "data.zip");
			await writeFile(target, buf).then(() => console.log("[nasr] NASR dump downloaded to disk.."));
			await extractArchive(target, handle).then(() => console.log("[nasr] Successfully extracted NASR data from ZIP archive."));
			return true;
		})
		.catch(err => {
			console.error("[nasr] Error retrieving or processing NASR data from FAA:", err.response ?? err.message ?? err);
			return false;
		});
	
	if (!downloaded) return process.exit(-1);
	const csvPath = path.join(handle, "APT_BASE.csv");
	if (!existsSync(csvPath)) {
		console.error("[nasr] FAA data did not contain APT_BASE dump. Aborting.")
		return { result: "Error" };
	}
	
	const csv = await readFile(csvPath, { encoding: "utf8" }).catch(() => null);
	if (!csv) {
		console.error("[nasr] Error reading CSV contents.");
		return { result: "Error" }
	}
	
	const tracked = await prisma
		.airport
		.findMany({ select: { icao_code: true }, distinct: ["icao_code"] })
		.then(results => new Set(...[results.map(result => result.icao_code)]));
	
	const filterValidIcaos = (record: RawAirportRef) => tracked.has(record.ICAO_ID)
		? record
		: null;
	
	const data = parse<RawAirportRef>(csv, { columns: true, skip_empty_lines: true, on_record: filterValidIcaos }).map(transformNasrRecord);
	console.log(`[nasr] Discovered ${data.length} NASR datapoints - saving to database..`)
	
	for (let i = 0; i < data.length; i += BATCH_SIZE) {
		const batch = data.slice(i, i + BATCH_SIZE);
		await prisma.$transaction(batch.map(
			payload => prisma.airport.update(payload)
		));
	}
	
	// the same bundle also carries the airways; seed them before the extracted files are cleaned up
	await seedAirways(handle);

	await cleanupTemp(handle);
	console.log(`[nasr] Done in ${Date.now() - start}ms.`)
}