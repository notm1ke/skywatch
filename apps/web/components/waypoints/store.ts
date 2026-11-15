import { create } from "zustand/react";
import { immediately } from "~/lib/utils";
import { WaypointMapStyleType } from "./style-selector";

/** how close "fly to this waypoint" gets by default */
const FOCUS_ZOOM = 11;

/** A request for the map to fly somewhere. The token makes each request distinct, so asking twice flies twice. */
type Focus = { id: string; zoom: number; token: number };

type WaypointPageControls = {
	/** the waypoint whose panel is open */
	selectedId: string | null;
	/** the waypoint under the pointer, on the map */
	hoverId: string | null;
	/** the airway whose chip is under the pointer in the panel: it lights up on the map */
	hoverAirway: string | null;
	/** what's typed in the search box */
	query: string;
	focus: Focus | null;
	hiddenTypes: string[];
	labels: boolean;
	style: WaypointMapStyleType;

	/** open a waypoint; `fly` also moves the map to it (a click on the map is already there, a search result isn't) */
	select: (id: string, fly?: boolean) => void;
	clear: () => void;
	setHover: (id: string | null) => void;
	setHoverAirway: (id: string | null) => void;
	flyTo: (id: string, zoom?: number) => void;
	search: (query: string) => void;
	toggleType: (type: string) => void;
	setLabels: (labels: boolean) => void;
	updateStyle: (style: WaypointMapStyleType) => void;
};

export const useWaypointControls = create<WaypointPageControls>((set, get) => ({
	selectedId: null,
	hoverId: null,
	hoverAirway: null,
	query: "",
	focus: null,
	hiddenTypes: [],
	labels: true,
	style: "default",

	select: (id, fly = false) => set(state => ({
		selectedId: id,
		query: id,
		hoverAirway: null,
		focus: fly ? { id, zoom: FOCUS_ZOOM, token: (state.focus?.token ?? 0) + 1 } : state.focus
	})),
	clear: () => set({ selectedId: null, hoverAirway: null, query: "" }),

	// these fire on every mouse move: only a change should reach the subscribers
	setHover: id => { if (get().hoverId !== id) set({ hoverId: id }); },
	setHoverAirway: id => { if (get().hoverAirway !== id) set({ hoverAirway: id }); },

	flyTo: (id, zoom = FOCUS_ZOOM) => set(state => ({ focus: { id, zoom, token: (state.focus?.token ?? 0) + 1 } })),
	search: query => set({ query }),
	toggleType: type => set(state => ({
		hiddenTypes: state.hiddenTypes.includes(type)
			? state.hiddenTypes.filter(hidden => hidden !== type)
			: [...state.hiddenTypes, type]
	})),
	setLabels: labels => set({ labels }),

	updateStyle: style => {
		if (style === "default") return set({ style });

		// set to default then immediately apply style - avoids `source id changed` error in react-map-gl
		set({ style: "default" });
		immediately(() => set({ style }));
	},
}));
