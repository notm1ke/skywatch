import { UsStateAbbreviations } from "~/lib/geo";

import {
	FileQuestion,
	Helicopter,
	LandPlot,
	LayoutGrid,
	Navigation,
	Radar,
	Sparkle,
	SplinePointer,
	Tangent,
	type LucideIcon
} from "lucide-react";

export type WaypointTypeInfo = {
	icon: LucideIcon;
	/** the dot on the map, the chip in the bar and the icon in the panel */
	color: string;
	/** the zoom this type starts to show at: there are ~46k plain waypoints, so they wait until you're close */
	appearsAt: number;
	description: string;
};

export const WAYPOINT_TYPES: Record<string, WaypointTypeInfo> = {
	WP: {
		icon: Sparkle,
		color: "#a78bfa",
		appearsAt: 8,
		description: "This is a standard waypoint for a predetermined geographical position defined by latitude and longitude."
	},
	RP: {
		icon: SplinePointer,
		color: "#14b8a6",
		appearsAt: 8,
		description: "This waypoint is a designated geographical location in which a pilot must report their position to ATC, on VFR charts it can also indicate a Right Pattern for a certain runway."
	},
	MR: {
		icon: Tangent,
		color: "#06b6d4",
		appearsAt: 6.5,
		description: "This waypoint is a designated geographical location in which military pilots must report their position to ATC, typically used to coordinate transitions between military training airspace and the National Airspace System."
	},
	CN: {
		icon: Navigation,
		color: "#3b82f6",
		appearsAt: 5,
		description: "This waypoint is used by onboard navigation computers to define a track, such as a dog-leg in an airway or transition point. They are not used by ATC or while filing flight plans."
	},
	MW: {
		icon: Helicopter,
		color: "#84cc16",
		appearsAt: 5,
		description: "This is a waypoint specifically designated for military operations, often used in Military Operations Areas (MOAs) or on Military Training Routes (MTRs), they may not be published on regular enroute charts."
	},
	NRS: {
		icon: LayoutGrid,
		color: "#ec4899",
		appearsAt: 6.5,
		description: "This waypoint is part of the Navigation Reference System (NRS), and is a grid-based point designated for high-altitude flight planning without the need of ground-based navaids."
	},
	VFR: {
		icon: LandPlot,
		color: "#22c55e",
		appearsAt: 6.5,
		description: "This waypoint is used specifically for VFR navigation, helping pilots navigate complex airspace or through mountainous terrain while maintaining situation awareness."
	},
	RADAR: {
		icon: Radar,
		color: "#ef4444",
		appearsAt: 3.5,
		description: "This waypoint is established by Air Traffic Control for vectoring and positioning. Pilots do not usually file these on flight plans, as they are not always associated with a physical ground-based navaid or published GPS waypoint."
	}
};

const UNKNOWN_TYPE: WaypointTypeInfo = {
	icon: FileQuestion,
	color: "#94a3b8",
	appearsAt: 8,
	description: "There is no description for this waypoint type."
};

export const typeInfo = (code: string): WaypointTypeInfo => WAYPOINT_TYPES[code] ?? UNKNOWN_TYPE;

export const waypointLocation = (stateCode: string) => {
	if (!stateCode.trim().length) return "Unknown";
	if (stateCode === "OA") return "Atlantic Ocean";
	if (stateCode === "OP") return "Pacific Ocean";
	if (stateCode === "OG") return "Gulf of America";

	// islands and other things we don't need to localize
	if (!UsStateAbbreviations[stateCode]) return "Unknown";

	return `${UsStateAbbreviations[stateCode]}, US`;
};

const AIRWAY_COLORS: Record<string, string> = {
	J: "#3b82f6", // jet routes
	V: "#22c55e", // victor airways
	Q: "#a855f7", // RNAV high
	T: "#14b8a6", // RNAV low
	Y: "#06b6d4"
};

/** the line on the map and the chip in the panel: the airway's family (J, V, Q, T...) decides it */
export const airwayColor = (id: string) => AIRWAY_COLORS[id.charAt(0)] ?? "#64748b";
