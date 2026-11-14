import { AirspaceType } from "@/schemas";
import { create } from "zustand";
import { AirportAdvisory } from "~/lib/schemas";

export type AirspaceOrAny = AirspaceType | "any";

/** where a hover came from: only a map hover scrolls the interruptions list to the row */
export type HoverSource = "map" | "list";

type AirspaceInteractivityState = {
	active: AirspaceOrAny;
	setActive: (active: AirspaceOrAny) => void;
	hovered: AirportAdvisory | null;
	hoverSource: HoverSource;
	hover: (active: AirportAdvisory | null, source?: HoverSource) => void;
};

export const useAirspaceInteractivity = create<AirspaceInteractivityState>((set) => ({
	active: "any",
	setActive: active => set({ active }),
	hovered: null,
	hoverSource: "map",
	hover: (hovered, hoverSource = "map") => set({ hovered, hoverSource }),
}));
