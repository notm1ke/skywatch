import { create } from "zustand/react";
import { Waypoint } from "@skywatch/gateway/schemas";

type WaypointPageControls = {
	active: Waypoint | null;
	query: string;
	activate: (active: Waypoint) => void;
	deactivate: () => void;
	search: (query: string) => void;
};

export const useWaypointPageControls = create<WaypointPageControls>((set) => ({
	active: null,
	query: "",
	activate: (active: Waypoint) => set({ active }),
	deactivate: () => set({ active: null }),
	search: (query: string) => set({ query }),
}));