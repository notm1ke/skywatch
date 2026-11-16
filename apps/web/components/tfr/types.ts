import type { CellSelectOption } from "~/components/ui/data-grid/types";

import {
	Crown,
	Drone,
	Flag,
	LandPlot,
	Lock,
	Megaphone,
	Rocket,
	type LucideIcon
} from "lucide-react";

export type TfrTypeInfo = {
	/** what the FAA calls it: the `type` of a TFR */
	value: string;
	/** what we call it */
	label: string;
	icon: LucideIcon;
	/** the polygon and dot on the map, the chip in the bar, the tile in the panel and the badge in the table */
	color: string;
	/** the table's badge is one of a fixed set of colors: this is the one that matches `color` */
	badge: CellSelectOption["color"];
	description: string;
};

// The order is the table's type menu. Amber is the "selected" color everywhere (see DESIGN.md), so none of these are.
export const TFR_TYPES: TfrTypeInfo[] = [
	{
		value: "AIR SHOWS/SPORTS",
		label: "Air Show / Sports",
		icon: LandPlot,
		color: "#22c55e",
		badge: "green",
		description: "Keeps aircraft out of the airspace over an air show or a major sporting event, so the crowd below and the performers above are safe."
	},
	{
		value: "HAZARDS",
		label: "Hazards",
		icon: Flag,
		color: "#ef4444",
		badge: "red",
		description: "Keeps aircraft away from something dangerous, like a wildfire, a chemical spill or a disaster area, so rescue and firefighting aircraft have the room they need."
	},
	{
		value: "SECURITY",
		label: "Security",
		icon: Lock,
		color: "#f97316",
		badge: "orange",
		description: "Restricts flying over or near something the government is protecting, such as a military base, a stadium or other critical infrastructure. Most TFRs are this kind."
	},
	{
		value: "SPACE OPERATIONS",
		label: "Space Operations",
		icon: Rocket,
		color: "#3b82f6",
		badge: "blue",
		description: "Clears the airspace under a rocket launch or the return of a spacecraft, including the zones where debris could fall."
	},
	{
		value: "SPECIAL",
		label: "Special",
		icon: Megaphone,
		color: "#a855f7",
		badge: "purple",
		description: "A one-off restriction that doesn't fit the other kinds, usually set up for a particular event or operation."
	},
	{
		value: "UAS PUBLIC GATHERING",
		label: "Drone Show",
		icon: Drone,
		color: "#6366f1",
		badge: "indigo",
		description: "Marks airspace used for a drone show or another public event with drones, so other aircraft know to stay clear."
	},
	{
		value: "VIP",
		label: "VIP Movement",
		icon: Crown,
		color: "#eab308",
		badge: "yellow",
		description: "Closes the airspace around a place the President, the Vice President or another protected person is visiting, for as long as they're there."
	}
];

const FALLBACK: TfrTypeInfo = {
	value: "",
	label: "Other",
	icon: Megaphone,
	color: "#94a3b8",
	badge: "outline",
	description: "A temporary flight restriction the FAA hasn't put in one of its usual categories."
};

const BY_VALUE = new Map(TFR_TYPES.map(type => [type.value, type]));

/** unknown types (the FAA can add one) get a neutral look rather than none */
export const typeInfo = (type: string): TfrTypeInfo => BY_VALUE.get(type) ?? { ...FALLBACK, value: type, label: type || FALLBACK.label };

/**
 * Where a TFR is, as the FAA writes it at the start of its description: "MAYPORT, FL, Monday, November 16, 2026 ...".
 * Some are shouted, so those get title case: "KEEWATIN" becomes "Keewatin". Short words and anything with a digit in it
 * ("1NM", "W") stay as they are.
 */
export const placeOf = (description: string) => {
	const place = description.split(",")[0].trim();
	if (place !== place.toUpperCase()) return place;

	return place
		.split(" ")
		.map(word => /^[A-Z']{3,}$/.test(word) ? `${word[0]}${word.slice(1).toLowerCase()}` : word)
		.join(" ");
};

/**
 * The dates the FAA writes after the place: "Monday, November 16, 2026 through Saturday, November 21, 2026 Local".
 * Some (permanent ones) have none, and that's an empty string.
 */
export const datesOf = (description: string) => description.split(",").slice(2).join(",").trim();

/** the FAA marks a TFR "new" for a little while after it's issued */
export const isNew = (tfr: { is_new: string }) => tfr.is_new === "Y";
