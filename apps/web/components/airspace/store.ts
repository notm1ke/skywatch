import { AirspaceType } from "@/schemas";
import { create } from "zustand";
import { AirportAdvisory } from "~/lib/schemas";

export type AirspaceOrAny = AirspaceType | "any";

type AirspaceInteractivityState = {
	active: AirspaceOrAny;
	setActive: (active: AirspaceOrAny) => void;
	hovered: AirportAdvisory | null;
	hover: (active: AirportAdvisory | null) => void;
};

export const useAirspaceInteractivity = create<AirspaceInteractivityState>((set) => ({
	active: "any",
	setActive: active => set({ active }),
	hovered: null,
	hover: hovered => set({ hovered }),
}));