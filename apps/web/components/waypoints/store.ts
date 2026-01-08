import { create } from "zustand/react";
import { immediately } from "~/lib/utils";
import { Waypoint } from "@skywatch/gateway/schemas";
import { WaypointMapStyleType } from "./style-selector";

type WaypointPageControls = {
	active: Waypoint | null;
	query: string;
	style: WaypointMapStyleType;
	activate: (active: Waypoint) => void;
	deactivate: () => void;
	search: (query: string) => void;
	updateStyle: (style: WaypointMapStyleType) => void;
};

export const useWaypointControls = create<WaypointPageControls>((set) => ({
	active: null,
	query: "",
	style: "default",
	activate: (active: Waypoint) => set({ active, query: active.waypoint_id }),
	deactivate: () => set({ active: null }),
	search: (query: string) => set({ query }),
	updateStyle: (style: WaypointMapStyleType) => {
		if (style === "default") return set({ style });
		
		// set to default then immediately apply style - avoids `source id changed` error in react-map-gl
		set({ style: "default" });
		immediately(() => set({ style }));
	},
}));
