import { cn } from "../utils";
import { ReactNode } from "react";

export type AtisGlossaryEntry = {
	patterns: RegExp[];
	color: string;
	tooltip: (match: RegExpMatchArray) => {
		title: string;
		description?: string;
		detail?: ReactNode; 
	};
}

type Color = "blue" | "red" | "green" | "yellow" | "purple" | "orange" | "pink" | "gray";

const colors: Record<Color, string> = {
	"blue": "decoration-blue-700/60 dark:decoration-blue-400/60 hover:decoration-blue-600 dark:hover:decoration-blue-400 text-blue-700/60 hover:text-blue-600 dark:text-blue-300/80 dark:hover:text-blue-300",
	"red": "decoration-red-700/60 dark:decoration-red-400/60 hover:decoration-red-600 dark:hover:decoration-red-400 text-red-700/60 hover:text-red-600 dark:text-red-300/80 dark:hover:text-red-300",
	"green": "decoration-green-700/60 dark:decoration-green-400/60 hover:decoration-green-600 dark:hover:decoration-green-400 text-green-700/60 hover:text-green-600 dark:text-green-300/80 dark:hover:text-green-300",
	"yellow": "decoration-yellow-700/60 dark:decoration-yellow-400/60 hover:decoration-yellow-600 dark:hover:decoration-yellow-400 text-yellow-700/60 hover:text-yellow-600 dark:text-yellow-300/80 dark:hover:text-yellow-300",
	"purple": "decoration-purple-700/60 dark:decoration-purple-400/60 hover:decoration-purple-600 dark:hover:decoration-purple-400 text-purple-700/60 hover:text-purple-600 dark:text-purple-300/80 dark:hover:text-purple-300",
	"orange": "decoration-orange-700/60 dark:decoration-orange-400/60 hover:decoration-orange-600 dark:hover:decoration-orange-400 text-orange-700/60 hover:text-orange-600 dark:text-orange-300/80 dark:hover:text-orange-300",
	"pink": "decoration-pink-700/60 dark:decoration-pink-400/60 hover:decoration-pink-600 dark:hover:decoration-pink-400 text-pink-700/60 hover:text-pink-600 dark:text-pink-300/80 dark:hover:text-pink-300",
	"gray": "decoration-gray-700/60 dark:decoration-gray-400/60 hover:decoration-gray-600 dark:hover:decoration-gray-400 text-gray-700/60 hover:text-gray-600 dark:text-gray-300/80 dark:hover:text-gray-300",
};

const createSimpleKeyword = (
	keywords: string[],
	wordBoundary: boolean,
	color: Color,
	tooltip: AtisGlossaryEntry["tooltip"]
): AtisGlossaryEntry => ({
	patterns: keywords.map(
		keyword => new RegExp(wordBoundary
			? `\\b${keyword}\\b`
			: keyword, 'gi'
		)
	),
	color: styling(color),
	tooltip
});

const styling = (color: Color) => cn(colors[color] ?? colors.gray);

const temperature = (input: string) => {
	if (input.startsWith("M")) return `-${parseInt(input.slice(1))}°C`;
	return `${parseInt(input)}°C`;
}

export const atisGlossary: AtisGlossaryEntry[] = [
	{
		patterns: [
			/RUNWAY(?:\s+)?(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi,
			/RWY(?:\s+)?(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi,
			/RY(?:\s+)?(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi,
			/LANDING\s+RUNWAY\s+(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi,
			/DEPARTING\s+RUNWAY\s+(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi,
			/LNDG\s+RWY(?:\s+)?(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi,
			/DEPG\s+RWY(?:\s+)?(\d{1,2}[LCR]?)(\/\d{1,2}[LCR]?)?\b/gi
		],
		color: styling("gray"),
		tooltip: (match) => ({
			title: "Runway Designation",
			description: "Identifies a specific runway by its magnetic heading rounded to the nearest 10 degrees. L/R/C indicate left/right/center parallel runways.",
			detail: `Runway ${match[1]}${match[2] ? match[2] : ""}`
		})
	},
	{
		patterns: [
			/TAXIWAY\s+([A-Z]\d*)\b/gi,
			/\bTWY\s+([A-Z]\d*)\b/gi,
			/\bTY\s+([A-Z]\d*)\b/gi
		],
		color: styling("blue"),
		tooltip: (match) => ({
			title: "Taxiway Designation",
			description: "Identifies a taxiway used for aircraft ground movement between runways and ramps.",
			detail: `Taxiway ${match[1]}`
		})
	},
	{
		patterns: [
			/\b(\d{3}\.\d{1,3})\b/gi
		],
		color: styling("green"),
		tooltip: (match) => ({
			title: "Radio Frequency",
			description: "VHF communication frequency in MHz for contacting ATC services like tower, ground, or clearance delivery.",
			detail: `${match[1]} MHz`
		})
	},
	{
		patterns: [
			/\bINFO\s+([A-Z])\b/gi
		],
		color: styling("blue"),
		tooltip: (match) => ({
			title: "ATIS Information Code",
			description: "Phonetic letter indicating the current version of the ATIS broadcast. Pilots confirm receipt by advising 'have information [letter]'.",
			detail: `Information ${match[1]}`
		})
	},
	{
		patterns: [
			/\b(\d{4})Z\b/gi
		],
		color: styling("green"),
		tooltip: (match) => ({
			title: "Zulu Time",
			description: "Coordinated Universal Time (UTC) in HHMM format, used in aviation for standardization.",
			detail: `${match[1]} UTC`
		})
	},
	{
		patterns: [
			/\b(\d{3})(\d{2,3})(G\d{2,3})?KT\b/gi
		],
		color: styling("gray"),
		tooltip: (match) => ({
			title: "Wind Information",
			description: "Wind direction (degrees) and speed (knots), with optional gusts (Gxx). Variable winds shown as VRB.",
			detail: `Wind from ${match[1]}° at ${match[2]} knots${match[3] ? ` gusting to ${match[3].slice(1)} knots` : ''}`
		})
	},
	{
		patterns: [
			/\b(M1\/[24]|1\/[24]SM|\d{1,2}SM)\b/gi
		],
		color: styling("blue"),
		tooltip: (match) => ({
			title: "Visibility",
			description: "Prevailing visibility in statute miles (SM). Fractions for less than 1 mile, M for less than indicated value.",
			detail: `Visibility: ${match[0]}`
		})
	},
	{
		patterns: [
			/\b(CLR|FEW|SCT|BKN|OVC)(\d{3})?\b/gi
		],
		color: styling("green"),
		tooltip: (match) => ({
			title: "Sky Condition",
			description: "Cloud coverage: CLR (clear), FEW (few), SCT (scattered), BKN (broken), OVC (overcast). Height in hundreds of feet if specified.",
			detail: `${match[1]}${match[2] ? ` at ${match[2]}00 feet` : ''}`
		})
	},
	{
		patterns: [
			/\b(\d{2}|M\d{2})\/(M?\d{2})\b/gi
		],
		color: styling("gray"),
		tooltip: (match) => ({
			title: "Temperature/Dew Point",
			description: "Air temperature and dew point in Celsius.",
			detail: `Temperature: ${temperature(match[1])} Dew Point: ${temperature(match[2])}`
		})
	},
	{
		patterns: [
			/\bA(\d{4})\b/gi
		],
		color: styling("blue"),
		tooltip: (match) => ({
			title: "Altimeter Setting",
			description: "Barometric pressure in inches of mercury for aircraft altimeter calibration.",
			detail: `${match[1].slice(0,2)}.${match[1].slice(2)} inHg`
		})
	},
	{
		patterns: [
			/\bSLP(\d{3})\b/gi
		],
		color: styling("green"),
		tooltip: (match) => ({
			title: "Sea Level Pressure",
			description: "Atmospheric pressure reduced to sea level in hectopascals (hPa).",
			detail: `${parseInt(match[1]) < 500 ? '10' + match[1] : '9' + match[1]} hPa`
		})
	},
	createSimpleKeyword(["RMK"], true, "gray", () => ({
		title: "Remarks",
		description: "Section of METAR/ATIS with additional weather or sensor data, e.g., AO2 for automated station."
	})),
	createSimpleKeyword(["ILS"], true, "blue", () => ({
		title: "Instrument Landing System",
		description: "Precision approach aid providing horizontal and vertical guidance to the runway."
	})),
	createSimpleKeyword(["RNAV"], true, "green", () => ({
		title: "Area Navigation",
		description: "Navigation method allowing aircraft to fly any desired path using GPS or other systems."
	})),
	createSimpleKeyword(["GPS"], true, "green", () => ({
		title: "Global Positioning System",
		description: "Navigation system using satellites to determine position and time."
	})),
	{
		patterns: [/APCH\s+(\d{1,2}[LCR]?)/gi],
		color: styling("gray"),
		tooltip: (match) => ({
			title: "Approach Runway",
			description: "Indicates this runway is currently configured for arriving aircraft.",
			detail: `Runway ${match[1]}`
		})
	},
	{
		patterns: [
			/SIMUL(TANEOUS)?\s?(VIS|VISUAL|INSTR|INSTRUMENT)?\s+AP(PROA)?CH(E)?S/gi,
			/SIMULAPP/gi
		],
		color: styling("blue"),
		tooltip: () => ({
			title: "Simultaneous Approaches",
			description: "Multiple aircraft approaching parallel or intersecting runways at the same time."
		})
	},
	{
		patterns: [
			/SIMUL(TANEOUS)?\s?(VIS|VISUAL|INSTR|INSTRUMENT)?\s+DEP(ARTURE)?S/gi,
			/SIMULDEP/gi
		],
		color: styling("blue"),
		tooltip: () => ({
			title: "Simultaneous Departures",
			description: "Multiple aircraft departing parallel or intersecting runways at the same time."
		})
	},
	{
		patterns: [
			/VISUAL\s+APCH(S)?/gi,
			/VISUAL\s+APPROACH(ES)?/gi,
			/\bCVFP\b/gi,
			/\bVIS\b/gi,
		],
		color: styling("gray"),
		tooltip: () => ({
			title: "Visual Approach",
			description: "Approach conducted under VFR in visual conditions, often following landmarks. CVFP: Charted Visual Flight Procedure."
		})
	},
	{
		patterns: [
			/INST(R)?\s+APCH(S)?/gi,
			/INSTRUMENT\s+APPROACH(ES)?/gi,
		],
		color: styling("gray"),
		tooltip: () => ({
			title: "Instrument Approach",
			description: "Approach conducted under IFR using instrument navigation aids."
		})
	},
	createSimpleKeyword(["OTS", "OUT OF SERVICE"], true, "red", () => ({
		title: "Out of Service",
		description: "Equipment or facility temporarily unavailable."
	})),
	createSimpleKeyword(["CLSD"], true, "red", () => ({
		title: "Closed",
		description: "Runway, taxiway, or other area not available for use."
	})),
	{
		patterns: [
			/NOTICE(S)?\s+TO\s+AIRMEN/gi,
			/NOTICE(S)?\s+TO\s+AIR\s+MISSIONS/gi,
			/NOTAMS/gi,
			/NOTAM/gi,
		],
		color: styling("blue"),
		tooltip: () => ({
			title: "Notice to Airmen (NOTAM)",
			description: "Time-critical aeronautical information, such as closures or hazards."
		})
	},
	createSimpleKeyword(["BIRD ACTIVITY", "BA ADZYS"], true, "orange", () => ({
		title: "Bird Activity",
		description: "Warning of increased bird presence in the airport vicinity, potential strike hazard."
	})),
	{
		patterns: [
			/READBACK\s+ALL\s+HOLD\s+SHORT\s+INSTRUCTIONS/gi,
			/READ\s+BACK\s+ALL\s+HOLD\s+SHORT/gi
		],
		color: styling("gray"),
		tooltip: () => ({
			title: "Readback Hold Short Instructions",
			description: "Pilots must repeat back instructions to stop before a specific point, e.g., a runway."
		})
	},
	createSimpleKeyword(["LAHSO"], true, "blue", () => ({
		title: "Land and Hold Short Operations",
		description: "Procedure to land and stop short of an intersecting runway or point."
	})),
	createSimpleKeyword(["FICON"], true, "green", () => ({
		title: "Field Condition",
		description: "Runway surface condition report, often for contaminants like snow or ice."
	})),
	{
		patterns: [
			/\b(\d\s?\/\s?\d\s?\/\s?\d)\b/gi,
			/COND(ITION)?\s?CODES?\s?,\s?([0-9]\s?)([0-9]\s?)([0-9])/gi
		],
		color: styling("purple"),
		tooltip: (match) => ({
			title: "Runway Condition Codes",
			description: "Assessment of runway braking action: 6 (dry) to 0 (nil), for touchdown/rollout/turnoff zones.",
			detail: `Condition: ${match.slice(-3).join(' ')}`
		})
	},
	createSimpleKeyword(["PAPI"], true, "blue", () => ({
		"title": "Precision Approach Path Indicator",
		"description": "Visual aid lights indicating if aircraft is on correct glide path."
	})),
	createSimpleKeyword(["ALSF-2", "SSALR", "MALS", "ALS"], true, "green", () => ({
		"title": "Approach Lighting System",
		"description": "Lights aiding visual transition to runway. Variants: ALSF-2 (high intensity with flashers), SSALR (simplified short), MALS (medium intensity)."
	})),
	createSimpleKeyword(["ERGL"], true, "gray", () => ({
		"title": "Elevated Runway Guard Lights",
		"description": "Lights indicating runway edge and direction of travel."
	})),
	createSimpleKeyword(["IM"], true, "gray", () => ({
		"title": "Inner Marker",
		"description": "ILS marker beacon indicating passage over decision height point."
	})),
	createSimpleKeyword(["OM"], true, "blue", () => ({
		"title": "Outer Marker",
		"description": "ILS marker beacon indicating start of final approach segment."
	})),
	createSimpleKeyword(["GS"], true, "green", () => ({
		"title": "Glide Slope",
		"description": "Vertical guidance component of ILS."
	})),
	createSimpleKeyword(["LOC"], true, "gray", () => ({
		"title": "Localizer",
		"description": "Horizontal guidance component of ILS."
	})),
	createSimpleKeyword(["DME"], true, "blue", () => ({
		"title": "Distance Measuring Equipment",
		"description": "Provides slant range distance to a ground station."
	})),
	createSimpleKeyword(["VOR"], true, "green", () => ({
		"title": "Very High Frequency Omni-directional Range",
		"description": "Ground-based navigation aid providing bearing information."
	})),
	createSimpleKeyword(["TACAN"], true, "gray", () => ({
		"title": "Tactical Air Navigation",
		"description": "Military navigation aid providing bearing and distance."
	})),
	createSimpleKeyword(["AO2"], true, "blue", () => ({
		"title": "Automated Weather Station Type",
		"description": "Indicates automated observation with precipitation discriminator."
	})),
	createSimpleKeyword(["TDWR"], true, "green", () => ({
		"title": "Terminal Doppler Weather Radar",
		"description": "Detects wind shear and precipitation near airports."
	})),
	createSimpleKeyword(["ASDE-X", "ASDE"], true, "gray", () => ({
		"title": "Airport Surface Detection Equipment",
		"description": "Radar system for monitoring ground movements to prevent runway incursions."
	})),
	createSimpleKeyword(["RWSL"], true, "blue", () => ({
		"title": "Runway Status Lights",
		"description": "Lights embedded in pavement indicating runway occupancy or impending departure."
	})),
	createSimpleKeyword(["BAK-12"], true, "green", () => ({
		"title": "Barrier Arresting Kit",
		"description": "Aircraft arresting gear for emergency stops."
	})),
	createSimpleKeyword(["HAZD WX"], true, "red", () => ({
		"title": "Hazardous Weather",
		"description": "Information available from Flight Service Station (FSS)."
	})),
	createSimpleKeyword(["BASH"], true, "blue", () => ({
		"title": "Bird/Animal Strike Hazard",
		"description": "Program to reduce wildlife hazards at airports."
	})),
	createSimpleKeyword(["LLWS"], true, "green", () => ({
		"title": "Low Level Wind Shear",
		"description": "Sudden change in wind speed/direction near the surface."
	})),
	createSimpleKeyword(["PIREP"], true, "gray", () => ({
		"title": "Pilot Report",
		"description": "Report of actual weather conditions encountered by pilots."
	})),
	createSimpleKeyword(["VFR"], true, "blue", () => ({
		"title": "Visual Flight Rules",
		"description": "Rules for flying in visual meteorological conditions."
	})),
	createSimpleKeyword(["RNP"], true, "blue", () => ({
		"title": "Required Navigation Performance",
		"description": "Performance-based navigation system that provides aircraft with a specified level of navigation accuracy."
	})),
]

export type AnnotatedAtisSegment = {
	text: string;
	color: string;
	tooltip?: {
		title: string;
		description?: string;
		detail?: string;
	};
}

export const parseAtisText = (text: string): AnnotatedAtisSegment[] => {
	const segments: AnnotatedAtisSegment[] = [];
	let currentIndex = 0;
	const matches: Array<{
		index: number;
		length: number;
		color: string;
		tooltip: any;
	}> = [];
	
	atisGlossary.forEach((entry) => {
		entry.patterns.forEach((pattern) => {
			const regex = new RegExp(pattern.source, pattern.flags);
			let match;
			while ((match = regex.exec(text)) !== null) {
				matches.push({
					index: match.index,
					length: match[0].length,
					color: entry.color,
					tooltip: entry.tooltip(match),
				});
			}
		});
	});

	matches.sort((a, b) => a.index - b.index);
	const filteredMatches = matches.filter((match, i) => {
		if (i === 0) return true;
		const prev = matches[i - 1];
		return match.index >= prev.index + prev.length;
	});

	filteredMatches.forEach((match) => {
		if (currentIndex < match.index) {
			segments.push({
				text: text.slice(currentIndex, match.index),
				color: match.color,
			});
		}
		
		segments.push({
			text: text.slice(match.index, match.index + match.length),
			color: match.color,
			tooltip: match.tooltip,
		});
		currentIndex = match.index + match.length;
	});

	if (currentIndex < text.length) {
		segments.push({
			text: text.slice(currentIndex),
			color: '',
		});
	}

	return segments;
}
