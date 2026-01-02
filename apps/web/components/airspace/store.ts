import { create } from "zustand";
import { AirportAdvisory } from "~/lib/schemas";

type AirspaceInteractivityState = {
	hovered: AirportAdvisory | null;
	hover: (active: AirportAdvisory | null) => void;
};

export const useAirspaceInteractivity = create<AirspaceInteractivityState>((set) => ({
	hovered: null,
	hover: hovered => set({ hovered }),
}));