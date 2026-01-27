import axios from "axios";
import path from "node:path";
import unzipper from "unzipper";

import { tmpdir } from "node:os";
import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { prisma } from "@/services/prisma";
import { pipeline } from "node:stream/promises";
import { mkdir, readFile, rm } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { BatchPayload } from "../generated/internal/prismaNamespace";

import {
	AircraftCreateInput,
	EngineCreateInput,
	PlaneRegistrationCreateManyInput,
} from "@/prisma/generated/models";

type RawAircraft = {
	CODE: string;
	MFR: string;
	MODEL: string;
	"TYPE-ACFT": string;
	"TYPE-ENG": string;
	"AC-CAT": string;
	"BUILD-CERT-IND": string;
	"NO-ENG": string;
	"NO-SEATS": string;
	"AC-WEIGHT": string;
	SPEED: string;
	"TC-DATA-SHEET": string;
	"TC-DATA-HOLDER": string;
}

type RawEngine = {
	CODE: string;
	MFR: string;
	MODEL: string;
	TYPE: string;
	HORSEPOWER: string;
	THRUST: string;
}

type RawRegistration = {
	"N-NUMBER": string;
	"SERIAL NUMBER": string;
	"MFR MDL CODE": string;
	"ENG MFR MDL": string;
	"YEAR MFR": string;
	"TYPE REGISTRANT": string;
	NAME: string;
	STREET: string;
	STREET2: string;
	CITY: string;
	STATE: string;
	"ZIP CODE": string;
	REGION: string;
	COUNTY: string;
	COUNTRY: string;
	"LAST ACTION DATE": string;
	"CERT ISSUE DATE": string;
	CERTIFICATION: string;
	"TYPE AIRCRAFT": string;
	"TYPE ENGINE": string;
	"STATUS CODE": string;
	"MODE S CODE": string;
	"FRACT OWNER": string;
	"AIR WORTH DATE": string;
	"OTHER NAMES(1)": string;
	"OTHER NAMES(2)": string;
	"OTHER NAMES(3)": string;
	"OTHER NAMES(4)": string;
	"OTHER NAMES(5)": string;
	"EXPIRATION DATE": string;
	"UNIQUE ID": string;
	"KIT MFR": string;
	"KIT MODEL": string;
	"MODE S CODE HEX": string;
}

const createTemp = async () => {
	const dir = path.join(tmpdir(), `skywatch-planes-${randomUUID()}`);
	await mkdir(dir);
	return dir;
}

const cleanupTemp = async (path: string) => rm(path, { recursive: true });

const extractArchive = async (archive: string, path: string, concurrency = 5) => unzipper
	.Open
	.file(archive)
	.then(handle => handle.extract({ path, concurrency }));

const toNativeEngine = (row: RawEngine): EngineCreateInput => ({
	id: row.CODE.trim(),
	manufacturer: row.MFR.trim(),
	model: row.MODEL.trim(),
	engine_type: row.TYPE.trim(),
	horsepower: parseInt(row.HORSEPOWER.trim()),
	thrust: parseInt(row.THRUST.trim())
});

const toNativeAircraft = (row: RawAircraft): AircraftCreateInput => ({
	id: row.CODE.trim(),
	manufacturer: row.MFR.trim(),
	model: row.MODEL.trim(),
	aircraft_type: row["TYPE-ACFT"].trim(),
	aircraft_weight: row["AC-WEIGHT"].trim(),
	aircraft_category: row["AC-CAT"].trim(),
	engine_type: row["TYPE-ENG"].trim(),
	build_cert: row["BUILD-CERT-IND"].trim(),
	engines: parseInt(row["NO-ENG"].trim()),
	seats: parseInt(row["NO-SEATS"].trim()),
	type_cert_data_sheet: row["TC-DATA-SHEET"].trim() || null,
	type_cert_data_holder: row["TC-DATA-HOLDER"].trim() || null
});

const condenseFractionalOwners = (row: RawRegistration) =>
	[
		row["OTHER NAMES(1)"],
		row["OTHER NAMES(2)"],
		row["OTHER NAMES(3)"],
		row["OTHER NAMES(4)"],
		row["OTHER NAMES(5)"],
	]
	.map(name => name.trim())
	.filter(Boolean);

const yyyyMMDD = /((?:19|20)\d{2})((?:0|1)?\d)(\d{2})/g;
const fixDateFormatting = (raw: string) => {
	if (!yyyyMMDD.test(raw)) return null;
	return raw.replace(yyyyMMDD, "$1-$2-$3") + "T00:00:00Z";
}

const zipPlusFour = /(\d{5})(\d{4})/g
const fixZipFormatting = (raw: string) => {
	if (!zipPlusFour.test(raw)) return raw;
	return raw.replace(zipPlusFour, '$1-$2');
}

const toNativeRegistration = (row: RawRegistration): PlaneRegistrationCreateManyInput => ({
	n_number: row["N-NUMBER"].trim(),
	serial_number: row["SERIAL NUMBER"].trim(),
	unique_id: row["UNIQUE ID"].trim(),
	mode_s: row["MODE S CODE"].trim(),
	mode_s_hex: row["MODE S CODE HEX"].trim(),
	aircraft_id: row["MFR MDL CODE"].trim(),
	aircraft_type: row["TYPE AIRCRAFT"].trim(),
	engine_id: row["ENG MFR MDL"].trim() || null,
	engine_type: row["TYPE ENGINE"].trim(),
	owner_name: row.NAME.trim(),
	owner_street: row.STREET.trim(),
	owner_street2: row.STREET2.trim() || null,
	owner_city: row.CITY.trim(),
	owner_state: row.STATE.trim(),
	owner_zip_code: fixZipFormatting(row["ZIP CODE"].trim()),
	owner_region: row.REGION.trim(),
	owner_county: row.COUNTY.trim(),
	owner_country: row.COUNTRY.trim(),
	owner_names: condenseFractionalOwners(row),
	fractionally_owned: row["FRACT OWNER"] === "Y",
	status: row["STATUS CODE"].trim(),
	mfg_year: row["YEAR MFR"].trim() || null,
	registrant_type: row["TYPE REGISTRANT"].trim() || "U",
	last_action_date: fixDateFormatting(row["LAST ACTION DATE"].trim()),
	airworthy_date: fixDateFormatting(row["AIR WORTH DATE"].trim()),
	expiration_date: fixDateFormatting(row["EXPIRATION DATE"].trim()),
	cert_type: row.CERTIFICATION.trim(),
	cert_issue_date: fixDateFormatting(row["CERT ISSUE DATE"].trim()),
	kit_manufacturer: row["KIT MFR"].trim() || null,
	kit_model: row["KIT MODEL"].trim() || null
})

const BATCH_SIZE = 10000;

export const seedPlanes = async () => {
	const start = Date.now();
	const handle = await createTemp();
	
	console.log("[planes] Downloading registry database from FAA, this will take some time..");
	
	const target = path.join(handle, "data.zip");
	const stream = await axios
		.get("http://registry.faa.gov/database/ReleasableAircraft.zip", {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
			},
			responseType: "stream",
			timeout: 0
		})
	
	await pipeline(stream.data, createWriteStream(target));
	await extractArchive(target, handle)
		.then(() => console.log("[planes] Successfully extracted plane registrations from ZIP archive."))
		.catch(err => {
			console.error("[planes] Error unpacking archive:", err.message);
			process.exit(-1);
		});
	
	const enginePath = path.join(handle, "ENGINE.txt");
	if (!existsSync(enginePath)) {
		console.error("[planes] FAA data did not contain an engines definition file. Aborting.")
		process.exit(-1);
	}
	
	let engineCsv = await readFile(enginePath, { encoding: "utf8" })
		.then(contents => contents.slice(1).replaceAll("\"", ""))
		.catch(() => null);
	
	if (!engineCsv) {
		console.error("[planes] Error reading engines definition file.");
		process.exit(-1);
	}
	
	let engines = parse<RawEngine>(engineCsv, { columns: true, skip_empty_lines: true, trim: true })
		.map(toNativeEngine)
		.filter(Boolean) as EngineCreateInput[];
	
	console.log(`[planes] Discovered ${engines.length} engine definitions - saving to database..`)
	
	await prisma.engine.deleteMany();
	await prisma.engine.createMany({ data: engines });
	engineCsv = null;
	engines = [];
	console.log("Available memory:", process.availableMemory());
	
	const aircraftPath = path.join(handle, "ACFTREF.txt");
	if (!existsSync(aircraftPath)) {
		console.error("[planes] FAA data did not contain an aircraft definition file. Aborting.")
		process.exit(-1);
	}
	
	let aircraftCsv = await readFile(aircraftPath, { encoding: "utf8" })
		.then(contents => contents.slice(1).replaceAll("\"", ""))
		.catch(() => null);
	
	if (!aircraftCsv) {
		console.error("[planes] Error reading aircraft definition file.");
		process.exit(-1);
	}
	
	let aircraft = parse<RawAircraft>(aircraftCsv, { columns: true, skip_empty_lines: true })
		.map(toNativeAircraft)
		.filter(Boolean) as AircraftCreateInput[];
	
	console.log(`[planes] Discovered ${aircraft.length} aircraft definitions - saving to database..`)
	
	await prisma.aircraft.deleteMany();
	let createdAircraft = 0;
	let batchCount = 0;
	
	for (let i = 0; i < aircraft.length; i += BATCH_SIZE) {
		let batch = aircraft.slice(i, i + BATCH_SIZE);
		console.time(` - Batch ${++batchCount}`);
		let result: BatchPayload | null = await prisma.aircraft.createMany({ data: batch });
		console.timeEnd(` - Batch ${batchCount}`);
		createdAircraft += result.count;
		result = null;
		batch = [];
	}
	
	if (createdAircraft < aircraft.length) console.warn(
		`[planes] ${createdAircraft} aircraft generated (${(createdAircraft / aircraft.length).toFixed(1)}% loss).`
	);
	
	aircraftCsv = null;
	aircraft = [];
	console.log("Available memory:", process.availableMemory());
	
	const registrationPath = path.join(handle, "MASTER.txt");
	if (!existsSync(registrationPath)) {
		console.error("[planes] FAA data did not contain registrations data. Aborting.")
		process.exit(-1);
	}
	
	let registrationCsv = await readFile(registrationPath, { encoding: "utf8" })
		.then(contents => contents.slice(1).replaceAll("\"", ""))
		.catch(() => null);
	
	if (!registrationCsv) {
		console.error("[planes] Error reading registration definition file.");
		process.exit(-1);
	}
	
	let registrations = parse<RawRegistration>(registrationCsv, { columns: true, skip_empty_lines: true, trim: true })
		.map(toNativeRegistration)
		.filter(Boolean) as PlaneRegistrationCreateManyInput[];
	
	console.log(`[planes] Discovered ${registrations.length} registration definitions - saving to database..`)
	
	await prisma.planeRegistration.deleteMany();
	let createdRegistrations = 0;
	batchCount = 0;
	
	for (let i = 0; i < registrations.length; i += BATCH_SIZE) {
		let batch = registrations.slice(i, i + BATCH_SIZE);
		console.time(` - Batch ${++batchCount}`);
		let result: BatchPayload | null = await prisma.planeRegistration.createMany({ data: batch });
		console.timeEnd(` - Batch ${batchCount}`);
		createdRegistrations += result.count;
		batch = [];
		result = null;
	}
	
	if (createdRegistrations < registrations.length) console.warn(
		`[planes] ${createdRegistrations} registration${createdRegistrations === 1 ? '' : 's'} generated (${(createdRegistrations / registrations.length).toFixed(1)}% loss).`
	);
	
	registrationCsv = null;
	registrations = [];
	await cleanupTemp(handle);
	
	console.log(`[planes] Done in ${Date.now() - start}ms.`);
}