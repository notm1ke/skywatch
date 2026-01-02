import { create } from "zustand";

export type InspectorTabType =
	| "operations"
	| "traffic"
	| "notams"
	| "reference";

type AirportInspectPageStore = {
	tab: InspectorTabType;
	switchTab: (tab: InspectorTabType) => void;
}

export const useAirportInspector = create<AirportInspectPageStore>((set) => ({
	tab: "operations",
	switchTab: (tab: InspectorTabType) => set({ tab }),
}));
