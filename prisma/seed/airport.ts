import { PrismaClient } from "~/prisma/generated/client";

const prisma = new PrismaClient();

const TARGETS = [
	'https://davidmegginson.github.io/ourairports-data/airports.csv',
	'https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv',
	'https://davidmegginson.github.io/ourairports-data/runways.csv',
	'https://davidmegginson.github.io/ourairports-data/navaids.csv'
]

function parseCSV(csvText: string): Record<string, string>[] {
	const lines = csvText.split('\n');
	if (lines.length < 2) return [];

	const headers = parseCSVLine(lines[0]);
	const results: Record<string, string>[] = [];
	
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i].trim()) continue;

		const values = parseCSVLine(lines[i]);
		const row: Record<string, string> = {};

		for (let j = 0; j < headers.length; j++) {
			row[headers[j]] = values[j] || '';
		}

		results.push(row);
	}

	return results;
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				// Handle escaped quotes
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += char;
		}
	}

	result.push(current);
	return result;
}

const upsertAirports = async (data: Record<string, string>[]) => {
	const start = Date.now();
	const BATCH_SIZE = 200;

	const ignored = new Set<string>();
	const usAirports = data.filter(row => row.iso_country === 'US');
	console.log(`Processing ${usAirports.length} US airports..`);
	
	for (let i = 0; i < usAirports.length; i += BATCH_SIZE) {
		const batch = usAirports.slice(i, i + BATCH_SIZE);
		await Promise.all(
			batch.map(async row => {
				try {
					if (!row.latitude_deg || !row.longitude_deg || !row.iata_code || !row.icao_code) {
						ignored.add(row.ident);
						return;
					}

					await prisma.airport.upsert({
						where: { id: parseInt(row.id) },
						update: {
							ident: row.ident,
							type: row.type,
							name: row.name,
							latitude_deg: parseFloat(row.latitude_deg),
							longitude_deg: parseFloat(row.longitude_deg),
							elevation_ft: row.elevation_ft ? parseInt(row.elevation_ft) : null,
							continent: row.continent,
							iso_country: row.iso_country,
							iso_region: row.iso_region,
							municipality: row.municipality,
							scheduled_service: row.scheduled_service,
							icao_code: row.icao_code,
							iata_code: row.iata_code,
							gps_code: row.gps_code,
							local_code: row.local_code,
							home_link: row.home_link,
							wikipedia_link: row.wikipedia_link,
							keywords: row.keywords
						},
						create: {
							id: parseInt(row.id),
							ident: row.ident,
							type: row.type,
							name: row.name,
							latitude_deg: parseFloat(row.latitude_deg),
							longitude_deg: parseFloat(row.longitude_deg),
							elevation_ft: row.elevation_ft ? parseInt(row.elevation_ft) : null,
							continent: row.continent,
							iso_country: row.iso_country,
							iso_region: row.iso_region,
							municipality: row.municipality,
							scheduled_service: row.scheduled_service,
							icao_code: row.icao_code,
							iata_code: row.iata_code,
							gps_code: row.gps_code,
							local_code: row.local_code,
							home_link: row.home_link,
							wikipedia_link: row.wikipedia_link,
							keywords: row.keywords
						}
					});
				} catch (error) {
					console.error(`Error upserting airport ID ${row.id}:`, error);
				}
			})
		);
	}

	console.log(`Finished processing ${usAirports.length - ignored.size} airport${usAirports.length === 1 ? '' : 's'} in ${(Date.now() - start).toFixed(2)}ms.`);
	return ignored;
}

const upsertAirportFrequencies = async (
	data: Record<string, string>[],
	usAirports: Record<string, string>[],
	ignored: Set<string>
) => {
	const start = Date.now();
	const BATCH_SIZE = 200;
	
	const usIdents = new Set([...usAirports
		.filter(row => !ignored.has(row.ident))
		.map(row => row.ident)
	]);
	
	const usData = data.filter(row => usIdents.has(row.airport_ident));
	console.log(`Processing ${usData.length} airport frequenc${usData.length === 1 ? 'y' : 'ies'}...`);
	
	let ignoreCount = 0;
	for (let i = 0; i < usData.length; i += BATCH_SIZE) {
		const batch = usData.slice(i, i + BATCH_SIZE);
		await Promise.all(
			batch.map(async row => {
				try {
					if (!row.frequency_mhz) return ignoreCount++;

					await prisma.airportFrequency.upsert({
						where: { id: parseInt(row.id) },
						update: {
							airport_ref: parseInt(row.airport_ref),
							airport_ident: row.airport_ident,
							type: row.type,
							description: row.description,
							frequency_mhz: parseFloat(row.frequency_mhz)
						},
						create: {
							id: parseInt(row.id),
							airport_ref: parseInt(row.airport_ref),
							airport_ident: row.airport_ident,
							type: row.type,
							description: row.description,
							frequency_mhz: parseFloat(row.frequency_mhz)
						}
					}).catch(() => ignoreCount++);
				} catch (error) {
					console.error(`Error upserting airport frequency ID ${row.id}:`, error);
				}
			})
		);
	}

	console.log(`Finished processing ${data.length - ignoreCount} airport frequency${(data.length - ignoreCount) === 1 ? 'y' : 'ies'} in ${(Date.now() - start).toFixed(2)}ms.`);
}

const upsertAirportRunways = async (
	data: Record<string, string>[],
	usAirports: Record<string, string>[],
	ignored: Set<string>
) => {
	const start = Date.now();
	const BATCH_SIZE = 200;

	const usIdents = new Set([...usAirports
		.filter(row => !ignored.has(row.ident))
		.map(row => row.ident)
	]);
	
	const usData = data.filter(row => usIdents.has(row.airport_ident));
	console.log(`Processing ${usData.length} airport runway${usData.length === 1 ? '' : 's'}...`);
	
	let ignoreCount = 0;
	for (let i = 0; i < usData.length; i += BATCH_SIZE) {
		const batch = usData.slice(i, i + BATCH_SIZE);
		await Promise.all(
			batch.map(async (row) => {
				try {
					await prisma.airportRunway.upsert({
						where: { id: parseInt(row.id) },
						update: {
							airport_ref: parseInt(row.airport_ref),
							airport_ident: row.airport_ident,
							length_ft: row.length_ft ? parseInt(row.length_ft) : null,
							width_ft: row.width_ft ? parseInt(row.width_ft) : null,
							surface: row.surface,
							lighted: row.lighted === "1",
							closed: row.closed === "1",
							le_ident: row.le_ident,
							le_latitude_deg: parseFloat(row.le_latitude_deg) || null,
							le_longitude_deg: parseFloat(row.le_longitude_deg) || null,
							le_elevation_ft: row.le_elevation_ft ? parseInt(row.le_elevation_ft) : null,
							le_heading_degT: parseFloat(row.le_heading_degT) || null,
							le_displaced_threshold_ft: row.le_displaced_threshold_ft ? parseInt(row.le_displaced_threshold_ft) : null,
							he_ident: row.he_ident,
							he_latitude_deg: parseFloat(row.he_latitude_deg) || null,
							he_longitude_deg: parseFloat(row.he_longitude_deg) || null,
							he_elevation_ft: row.he_elevation_ft ? parseInt(row.he_elevation_ft) : null,
							he_heading_degT: parseFloat(row.he_heading_degT) || null,
							he_displaced_threshold_ft: row.he_displaced_threshold_ft ? parseInt(row.he_displaced_threshold_ft) : null
						},
						create: {
							id: parseInt(row.id),
							airport_ref: parseInt(row.airport_ref),
							airport_ident: row.airport_ident,
							length_ft: row.length_ft ? parseInt(row.length_ft) : null,
							width_ft: row.width_ft ? parseInt(row.width_ft) : null,
							surface: row.surface,
							lighted: row.lighted === "1",
							closed: row.closed === "1",
							le_ident: row.le_ident,
							le_latitude_deg: parseFloat(row.le_latitude_deg) || null,
							le_longitude_deg: parseFloat(row.le_longitude_deg) || null,
							le_elevation_ft: row.le_elevation_ft ? parseInt(row.le_elevation_ft) : null,
							le_heading_degT: parseFloat(row.le_heading_degT) || null,
							le_displaced_threshold_ft: row.le_displaced_threshold_ft ? parseInt(row.le_displaced_threshold_ft) : null,
							he_ident: row.he_ident,
							he_latitude_deg: parseFloat(row.he_latitude_deg) || null,
							he_longitude_deg: parseFloat(row.he_longitude_deg) || null,
							he_elevation_ft: row.he_elevation_ft ? parseInt(row.he_elevation_ft) : null,
							he_heading_degT: parseFloat(row.he_heading_degT) || null,
							he_displaced_threshold_ft: row.he_displaced_threshold_ft ? parseInt(row.he_displaced_threshold_ft) : null
						}
					}).catch(() => ignoreCount++);
				} catch (error) {
					console.error(`Error upserting runway ID ${row.id}:`, error);
				}
			})
		);
	}

	console.log(`Finished processing ${usData.length - ignoreCount} airport runway${(usData.length - ignoreCount) === 1 ? '' : 's'} in ${(Date.now() - start).toFixed(2)}ms.`);
}

const upsertAirportNavs = async (
	data: Record<string, string>[],
	usAirports: Record<string, string>[],
	ignored: Set<string>
) => {
	const start = Date.now();
	const BATCH_SIZE = 200;
	
	const usIcaoCodes = new Set([...usAirports
		.filter(row => !ignored.has(row.icao_code))
		.map(row => row.icao_code)
	]);
	
	const usData = data.filter(row => usIcaoCodes.has(row.associated_airport));
	console.log(`Processing ${usData.length} airport navaid${usData.length === 1 ? '' : 's'}...`);

	let ignoreCount = 0;
	for (let i = 0; i < usData.length; i += BATCH_SIZE) {
		const batch = usData.slice(i, i + BATCH_SIZE);
		await Promise.all(
			batch.map(async (row) => {
				try {
					if (!row.associated_airport) return ignoreCount++;
					
					await prisma.airportNav.upsert({
						where: { id: parseInt(row.id) },
						update: {
							filename: row.filename,
							ident: row.ident,
							name: row.name,
							type: row.type,
							frequency_khz: row.frequency_khz ? parseInt(row.frequency_khz) : null,
							latitude_deg: parseFloat(row.latitude_deg) || null,
							longitude_deg: parseFloat(row.longitude_deg) || null,
							elevation_ft: row.elevation_ft ? parseInt(row.elevation_ft) : null,
							iso_country: row.iso_country,
							dme_frequency_khz: row.dme_frequency_khz ? parseInt(row.dme_frequency_khz) : null,
							dme_channel: row.dme_channel,
							dme_latitude_deg: parseFloat(row.dme_latitude_deg) || null,
							dme_longitude_deg: parseFloat(row.dme_longitude_deg) || null,
							dme_elevation_ft: row.dme_elevation_ft ? parseInt(row.dme_elevation_ft) : null,
							slaved_variation_deg: parseFloat(row.slaved_variation_deg) || null,
							magnetic_variation_deg: parseFloat(row.magnetic_variation_deg) || null,
							usageType: row.usageType,
							power: row.power,
							associated_airport: row.associated_airport
						},
						create: {
							id: parseInt(row.id),
							filename: row.filename,
							ident: row.ident,
							name: row.name,
							type: row.type,
							frequency_khz: row.frequency_khz ? parseInt(row.frequency_khz) : null,
							latitude_deg: parseFloat(row.latitude_deg) || null,
							longitude_deg: parseFloat(row.longitude_deg) || null,
							elevation_ft: row.elevation_ft ? parseInt(row.elevation_ft) : null,
							iso_country: row.iso_country,
							dme_frequency_khz: row.dme_frequency_khz ? parseInt(row.dme_frequency_khz) : null,
							dme_channel: row.dme_channel,
							dme_latitude_deg: parseFloat(row.dme_latitude_deg) || null,
							dme_longitude_deg: parseFloat(row.dme_longitude_deg) || null,
							dme_elevation_ft: row.dme_elevation_ft ? parseInt(row.dme_elevation_ft) : null,
							slaved_variation_deg: parseFloat(row.slaved_variation_deg) || null,
							magnetic_variation_deg: parseFloat(row.magnetic_variation_deg) || null,
							usageType: row.usageType,
							power: row.power,
							associated_airport: row.associated_airport
						}
					}).catch(() => ignoreCount++);
				} catch (error) {
					console.error(`Error upserting navaid ID ${row.id}:`, error);
				}
			})
		);
	}

	console.log(`Finished processing ${usData.length - ignoreCount} airport navaid${(usData.length - ignoreCount) === 1 ? '' : 's'} in ${(Date.now() - start).toFixed(2)}ms.`);
}

const start = Date.now();
console.log("Starting airport data sync...");

try {
	let ignored = new Set<string>();
	let usAirports: Record<string, string>[] = [];
	for (const target of TARGETS) {
		console.log(`Fetching data from ${target}...`);

		const response = await fetch(target);
		if (!response.ok) throw new Error(
			`Failed to fetch ${target}: ${response.status} ${response.statusText}`
		);

		const csv = await response.text();
		const rows = parseCSV(csv);
		if (rows.length === 0) {
			console.warn(`No data found in ${target}`);
			continue;
		}

		if (target.includes('airports.csv')) {
			usAirports = rows.filter(row => row.iso_country === 'US');
			ignored = await upsertAirports(usAirports);
		}
		
		// console.log(ignored);
		if (target.includes('airport-frequencies.csv')) await upsertAirportFrequencies(rows, usAirports, ignored);
		if (target.includes('runways.csv')) await upsertAirportRunways(rows, usAirports, ignored);
		if (target.includes('navaids.csv')) await upsertAirportNavs(rows, usAirports, ignored);
	}

	console.log(`Airport sync completed in ${(Date.now() - start).toFixed(2)}ms.`);
} catch (error) {
	console.error("Error during airport data sync:", error);
	throw error;
}