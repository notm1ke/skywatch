/**
 * Decoders for the raw codes stored on airport rows (OurAirports + FAA NASR).
 *
 * Every decoder returns `{ label, raw, known }`. Anything we couldn't source from the FAA data
 * dictionaries (e.g. inspection method codes) is intentionally NOT decoded: `known` is false and the
 * UI shows the raw code with a "definition unavailable" tooltip, instead of a guessed meaning.
 *
 * Sources:
 *  - Fuel, Part 139 class/index, inspector, surface type + condition:
 *    FAA ADIP Airport Master Record data dictionary
 *    https://adip.faa.gov/agis/public/data/onlineHelp/pdf/amr/AirportMasterRecordsDataDictionary.pdf
 *  - Federal agreement (NASP) codes: FAA NASR APT layout, as reproduced on airportflyer.com (third party).
 *  - Tower types: openNASR APT_BASE docs, plus labels shared with the airports filter sidebar.
 */

export type Decoded = {
	/** Human readable value. */
	label: string;
	/** Extra explanation for a tooltip. */
	detail?: string;
	/** The code as stored. */
	raw: string;
	/** False when no authoritative decode exists, and `label` is just the raw code. */
	known: boolean;
};

const decodeFrom = (table: Record<string, string | [string, string]>, code: string): Decoded => {
	const hit = table[code];
	if (!hit) return { label: code, raw: code, known: false };
	return Array.isArray(hit)
		? { label: hit[0], detail: hit[1], raw: code, known: true }
		: { label: hit, raw: code, known: true };
};

/** `""` (empty NASR field) becomes `[""]` after `split`; drop blanks. */
export const cleanList = (values: readonly string[] | null | undefined) =>
	(values ?? []).map(v => v.trim()).filter(Boolean);

// ---------------------------------------------------------------------------------------------
// Identity / place

export const AIRPORT_TYPE_LABELS: Record<string, string> = {
	large_airport: "Large airport",
	medium_airport: "Medium airport",
	small_airport: "Small airport",
	heliport: "Heliport",
	seaplane_base: "Seaplane base",
	balloonport: "Balloonport",
	closed: "Closed",
};

export const CONTINENT_LABELS: Record<string, string> = {
	AF: "Africa",
	AN: "Antarctica",
	AS: "Asia",
	EU: "Europe",
	NA: "North America",
	OC: "Oceania",
	SA: "South America",
};

export const ARTCC_NAMES: Record<string, string> = {
	ZAB: "Albuquerque",
	ZAN: "Anchorage",
	ZAU: "Chicago",
	ZBW: "Boston",
	ZDC: "Washington",
	ZDV: "Denver",
	ZFW: "Fort Worth",
	ZHN: "Honolulu",
	ZHU: "Houston",
	ZID: "Indianapolis",
	ZJX: "Jacksonville",
	ZKC: "Kansas City",
	ZLA: "Los Angeles",
	ZLC: "Salt Lake City",
	ZMA: "Miami",
	ZME: "Memphis",
	ZMP: "Minneapolis",
	ZNY: "New York",
	ZOA: "Oakland",
	ZOB: "Cleveland",
	ZSE: "Seattle",
	ZSU: "San Juan",
	ZTL: "Atlanta",
	ZUA: "Guam",
};

// ---------------------------------------------------------------------------------------------
// FAA NASR codes

const PART_139_CLASSES = ["I", "II", "III", "IV"];
const ARFF_INDEXES = ["A", "B", "C", "D", "E"];

/**
 * `rescue_flags` is NASR's `FAR_139_TYPE_CODE` split on spaces, e.g. ["I", "E"] = Class I, ARFF Index E.
 * Returns null when the airport isn't Part 139 certificated.
 */
export const decodePart139 = (flags: readonly string[] | null | undefined): Decoded | null => {
	const parts = cleanList(flags);
	if (!parts.length) return null;

	const raw = parts.join(" ");
	const cls = parts.find(p => PART_139_CLASSES.includes(p));
	const index = parts.find(p => ARFF_INDEXES.includes(p));

	// Only decode the shapes the data dictionary describes; anything else (e.g. a lone "L") stays raw.
	if (!cls || !index) return { label: raw, raw, known: false };
	return {
		label: `Class ${cls} · ARFF Index ${index}`,
		detail: "14 CFR Part 139 airport operating certificate class, and aircraft rescue and firefighting index.",
		raw,
		known: true,
	};
};

/** NPIAS / federal agreement codes (`nasp_flags`, one letter each). */
export const FEDERAL_AGREEMENT_CODES: Record<string, string> = {
	N: "National Plan of Integrated Airport Systems (NPIAS)",
	B: "Navaid installation on private airport (F&E program)",
	G: "Grant agreements (FAAP / ADAP / AIP)",
	H: "Compliance with accessibility for the handicapped",
	P: "Surplus property agreement (Public Law 289)",
	R: "Surplus property agreement (Regulation 16-WAA)",
	S: "Conveyance (Federal Airport Act §16 / Airport and Airway Development Act §23)",
	Y: "Assurances under Title VI, Civil Rights Act of 1964",
};

export const decodeFederalAgreement = (code: string): Decoded => decodeFrom(FEDERAL_AGREEMENT_CODES, code);

/** `inspector_type` (NASR `INSPECTOR_CODE`). */
export const decodeInspector = (code: string | null | undefined): Decoded | null => {
	if (!code) return null;
	return decodeFrom({
		C: "Contractor",
		F: "FAA",
		N: "Not inspected",
		S: "State",
	}, code);
};

/**
 * `inspection_type` (NASR `INSPECT_METHOD_CODE`).
 * Deliberately NOT decoded: the data dictionaries we could reach don't list its values.
 */
export const decodeInspectionMethod = (code: string | null | undefined): Decoded | null => {
	if (!code) return null;
	return { label: code, raw: code, known: false };
};

export const decodeAtcType = (labels: Record<string, string>, code: string | null | undefined): Decoded => {
	const raw = code ?? "UNCONTROLLED";
	const label = labels[raw];
	return label ? { label, raw, known: true } : { label: raw, raw, known: false };
};

// ---------------------------------------------------------------------------------------------
// Fuel

const FUEL_CODES: Record<string, [string, string]> = {
	"100": ["100 (green)", "Grade 100 gasoline (green)"],
	"100L": ["100LL", "Grade 100 low-lead gasoline (blue)"],
	"100LL": ["100LL", "Grade 100 low-lead gasoline (blue)"],
	"A++": ["Jet A++", "Jet A kerosene with FS-II, CI/LI, SDA; freeze point −40°C"],
	"A++10": ["Jet A++100", "Jet A kerosene with FS-II, CI/LI, SDA, freeze point −40°C, plus +100 thermal stability additive"],
	"A1": ["Jet A-1", "Jet A-1 kerosene without FS-II; freeze point −47°C"],
	"A1+": ["Jet A-1+", "Jet A-1 kerosene with FS-II; freeze point −47°C"],
	"A": ["Jet A", "Jet A kerosene without FS-II; freeze point −40°C"],
	"A+": ["Jet A+", "Jet A kerosene with icing inhibitor"],
	"H": ["Hydrogen", "Hydrogen"],
	"J": ["Jet (unknown type)", "Jet fuel, type unknown"],
	"J5": ["JP-5", "JP-5 military kerosene with FS-II; freeze point −46°C"],
	"J8": ["JP-8", "JP-8 military Jet A-1 kerosene with FS-II, CI/LI, SDA; freeze point −47°C"],
	"J8+10": ["JP-8+100", "JP-8 with +100 thermal stability additive"],
	"MOGAS": ["Mogas", "Automobile gasoline approved for use as aircraft fuel"],
	"UL91": ["UL91", "Unleaded grade 91 gasoline"],
	"UL94": ["UL94", "Unleaded grade 94 gasoline"],
	"G100UL": ["G100UL", "Unleaded grade 100 gasoline (GAMI)"],
	"100R": ["100R", "Unleaded grade 100 gasoline (Swift)"],
};

export const decodeFuel = (code: string): Decoded => decodeFrom(FUEL_CODES, code);

// ---------------------------------------------------------------------------------------------
// Runways

const SURFACE_TOKENS: Record<string, string> = {
	ASPH: "Asphalt", ASP: "Asphalt",
	CONC: "Concrete", CON: "Concrete",
	DIRT: "Dirt",
	GRAVEL: "Gravel", GRVL: "Gravel", GVL: "Gravel",
	TURF: "Turf", GRS: "Turf", SOD: "Turf", GRASS: "Turf",
	TRTD: "Treated", TREATED: "Treated",
	WATER: "Water",
	ICE: "Ice",
	SNOW: "Snow",
	SAND: "Sand",
	MATS: "Mats",
	CORAL: "Coral",
	METAL: "Metal",
	STEEL: "Steel",
	ALUMINUM: "Aluminum",
	BRICK: "Brick",
	WOOD: "Wood",
	ROOFTOP: "Rooftop", "ROOF-TOP": "Rooftop",
	PEM: "Porous friction (PEM)",
	PFC: "Porous friction (PFC)",
	PSP: "Pierced steel planking",
};

const SURFACE_CONDITIONS: Record<string, string> = {
	E: "Excellent",
	G: "Good",
	F: "Fair",
	P: "Poor",
	L: "Failed",
};

/** Runway surface, e.g. "ASPH-G" -> Asphalt (Good), "CONC-TRTD" -> Concrete / Treated. */
export const decodeSurface = (surface: string | null | undefined): Decoded => {
	const raw = (surface ?? "").trim();
	if (!raw) return { label: "Unknown", raw, known: false };

	const tokens = raw.toUpperCase().split("-").filter(Boolean);
	const last = tokens[tokens.length - 1];
	const condition = tokens.length > 1 && last.length === 1 ? SURFACE_CONDITIONS[last] : undefined;
	if (condition) tokens.pop();

	const known = tokens.every(t => t in SURFACE_TOKENS);
	const name = tokens.map(t => SURFACE_TOKENS[t] ?? t).join(" / ");
	return {
		label: condition ? `${name} (${condition})` : name,
		raw,
		known,
	};
};

// ---------------------------------------------------------------------------------------------
// Frequencies / navaids

export const FREQUENCY_TYPE_LABELS: Record<string, string> = {
	TWR: "Tower",
	GND: "Ground",
	CLD: "Clearance delivery",
	CLNC: "Clearance delivery",
	ATIS: "ATIS",
	APP: "Approach",
	DEP: "Departure",
	"APP/DEP": "Approach / Departure",
	CTAF: "CTAF",
	UNIC: "UNICOM",
	UNICOM: "UNICOM",
	MULTICOM: "MULTICOM",
	RMP: "Ramp",
	AWOS: "AWOS",
	ASOS: "ASOS",
	FSS: "Flight service",
	CNTR: "Center",
	EMR: "Emergency",
	"A/D": "Arrival / Departure",
	ARR: "Arrival",
	OPS: "Operations",
	PMSV: "Pilot-to-metro",
};

export const decodeFrequencyType = (type: string): Decoded => {
	const raw = type.trim();
	const label = FREQUENCY_TYPE_LABELS[raw.toUpperCase()];
	return label ? { label, raw, known: true } : { label: raw, raw, known: false };
};

/** Navaid frequency. VHF-band aids (VOR/DME/TACAN family) are shown in MHz; NDBs in kHz. */
export const formatNavaidFrequency = (type: string, frequencyKhz: number | null): string | null => {
	if (frequencyKhz == null) return null;
	if (type.toUpperCase().startsWith("NDB")) return `${frequencyKhz} kHz`;
	return `${(frequencyKhz / 1000).toFixed(2)} MHz`;
};

// ---------------------------------------------------------------------------------------------
// Misc formatting

/** Maps vanity letters in phone numbers ("1-800-WX-BRIEF") to a dialable string. */
export const dialablePhone = (phone: string): string => {
	const keypad: Record<string, string> = {
		A: "2", B: "2", C: "2", D: "3", E: "3", F: "3", G: "4", H: "4", I: "4", J: "5", K: "5", L: "5",
		M: "6", N: "6", O: "6", P: "7", Q: "7", R: "7", S: "7", T: "8", U: "8", V: "8", W: "9", X: "9", Y: "9", Z: "9",
	};
	return phone
		.toUpperCase()
		.replace(/[A-Z]/g, ch => keypad[ch] ?? "")
		.replace(/[^\d+]/g, "");
};

/** Decimal degrees -> 37°37′07.7″N. Works in whole tenths of arcseconds so rounding can't yield 60.0″. */
export const toDms = (value: number, axis: "lat" | "lon"): string => {
	const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
	const tenths = Math.round(Math.abs(value) * 3600 * 10);
	const deg = Math.floor(tenths / 36000);
	const min = Math.floor((tenths % 36000) / 600);
	const sec = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
	return `${deg}°${String(min).padStart(2, "0")}′${sec}″${hemi}`;
};
