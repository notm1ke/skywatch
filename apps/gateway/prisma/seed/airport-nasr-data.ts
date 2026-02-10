import axios from "axios";
import path from "node:path";
import unzipper from "unzipper";
import moment from "moment-timezone";

import { load } from "cheerio";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { prisma } from "@/services/prisma";
import { AirportUpdateArgs } from "@/prisma/generated/models";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const BATCH_SIZE = 1000;

const createTemp = async () => {
	const dir = path.join(tmpdir(), `skywatch-nasr-${randomUUID()}`);
	await mkdir(dir);
	return dir;
}

const cleanupTemp = async (path: string) => rm(path, { recursive: true });

const extractArchive = async (archive: string, path: string, concurrency = 5) => unzipper
	.Open
	.file(archive)
	.then(handle => handle.extract({ path, concurrency }));

/**
 * {
    "EFF_DATE": "2025-12-25",
    "SITE_NO": "02187.",
    "SITE_TYPE_CODE": "A",
    "STATE_CODE": "CA",
    "ARPT_ID": "SFO",
    "CITY": "SAN FRANCISCO",
    "COUNTRY_CODE": "US",
    "REGION_CODE": "AWP",
    "ADO_CODE": "SFO",
    "STATE_NAME": "CALIFORNIA",
    "COUNTY_NAME": "SAN MATEO",
    "COUNTY_ASSOC_STATE": "CA",
    "ARPT_NAME": "SAN FRANCISCO INTL",
    "OWNERSHIP_TYPE_CODE": "PU",
    "FACILITY_USE_CODE": "PU",
    "LAT_DEG": 37,
    "LAT_MIN": 37,
    "LAT_SEC": 7.7,
    "LAT_HEMIS": "N",
    "LAT_DECIMAL": 37.61880555,
    "LONG_DEG": 122,
    "LONG_MIN": 22,
    "LONG_SEC": 31.5,
    "LONG_HEMIS": "W",
    "LONG_DECIMAL": -122.37541666,
    "SURVEY_METHOD_CODE": "E",
    "ELEV": 13.1,
    "ELEV_METHOD_CODE": "S",
    "MAG_VARN": 14,
    "MAG_HEMIS": "E",
    "MAG_VARN_YEAR": 2015,
    "TPA": null,
    "CHART_NAME": "SAN FRANCISCO",
    "DIST_CITY_TO_AIRPORT": 8,
    "DIRECTION_CODE": "SE",
    "ACREAGE": 5207,
    "RESP_ARTCC_ID": "ZOA",
    "COMPUTER_ID": "ZCO",
    "ARTCC_NAME": "OAKLAND",
    "FSS_ON_ARPT_FLAG": "N",
    "FSS_ID": "OAK",
    "FSS_NAME": "OAKLAND",
    "PHONE_NO": null,
    "TOLL_FREE_NO": "1-800-WX-BRIEF",
    "ALT_FSS_ID": null,
    "ALT_FSS_NAME": null,
    "ALT_TOLL_FREE_NO": null,
    "NOTAM_ID": "SFO",
    "NOTAM_FLAG": "Y",
    "ACTIVATION_DATE": "1940/04",
    "ARPT_STATUS": "O",
    "FAR_139_TYPE_CODE": "I E",
    "FAR_139_CARRIER_SER_CODE": "S",
    "ARFF_CERT_TYPE_DATE": "1973/05",
    "NASP_CODE": "NGPRY",
    "ASP_ANLYS_DTRM_CODE": "NO OBJECTION",
    "CUST_FLAG": "N",
    "LNDG_RIGHTS_FLAG": "Y",
    "JOINT_USE_FLAG": "N",
    "MIL_LNDG_FLAG": "Y",
    "INSPECT_METHOD_CODE": "F",
    "INSPECTOR_CODE": "F",
    "LAST_INSPECTION": "2025-06-23",
    "LAST_INFO_RESPONSE": null,
    "FUEL_TYPES": "100LL,A,A++",
    "AIRFRAME_REPAIR_SER_CODE": "NONE",
    "PWR_PLANT_REPAIR_SER": "NONE",
    "BOTTLED_OXY_TYPE": "HIGH/LOW",
    "BULK_OXY_TYPE": "NONE",
    "LGT_SKED": null,
    "BCN_LGT_SKED": "SS-SR",
    "TWR_TYPE_CODE": "ATCT",
    "SEG_CIRCLE_MKR_FLAG": "N",
    "BCN_LENS_COLOR": "WG",
    "LNDG_FEE_FLAG": "Y",
    "MEDICAL_USE_FLAG": null,
    "ARPT_PSN_SOURCE": "3RD PARTY SURVEY",
    "POSITION_SRC_DATE": "2014-10-22",
    "ARPT_ELEV_SOURCE": "3RD PARTY SURVEY",
    "ELEVATION_SRC_DATE": "2014-10-22",
    "CONTR_FUEL_AVBL": null,
    "TRNS_STRG_BUOY_FLAG": null,
    "TRNS_STRG_HGR_FLAG": "Y",
    "TRNS_STRG_TIE_FLAG": "N",
    "OTHER_SERVICES": "AFRT,AVNCS,CARGO,CHTR",
    "WIND_INDCR_FLAG": "Y-L",
    "ICAO_ID": "KSFO",
    "MIN_OP_NETWORK": "N",
    "USER_FEE_FLAG": null,
    "CTA": null
 }
 */

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
	
	const handle = await createTemp();
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
	
	await cleanupTemp(handle);
	console.log(`[nasr] Done in ${Date.now() - start}ms.`)
}