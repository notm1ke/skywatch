import { create } from "zustand/react";

/** A request for the map to fly to a TFR. The token makes each request distinct, so asking twice flies twice. */
type Focus = { id: string; token: number };

type TfrPageControls = {
	/** the TFR whose panel is open: a NOTAM id like "6/7601" */
	selectedId: string | null;
	/** the TFR under the pointer, on the map or in the table */
	hoverId: string | null;
	focus: Focus | null;
	hiddenTypes: string[];
	labels: boolean;
	/** the table only lists the TFRs the map is showing */
	inView: boolean;
	/** what the map is showing, [west, south, east, north] */
	view: [number, number, number, number] | null;

	/** open a TFR; `fly` also moves the map to it (a click on the map is already there, a click in the table isn't) */
	select: (id: string, fly?: boolean) => void;
	clear: () => void;
	setHover: (id: string | null) => void;
	toggleType: (type: string) => void;
	setLabels: (labels: boolean) => void;
	setInView: (inView: boolean) => void;
	setView: (view: [number, number, number, number]) => void;
	/** put everything back: nothing open, every type on, the whole table */
	reset: () => void;
};

export const useTfrControls = create<TfrPageControls>((set, get) => ({
	selectedId: null,
	hoverId: null,
	focus: null,
	hiddenTypes: [],
	labels: true,
	inView: false,
	view: null,

	select: (id, fly = false) => set(state => ({
		selectedId: id,
		focus: fly ? { id, token: (state.focus?.token ?? 0) + 1 } : state.focus
	})),
	clear: () => set({ selectedId: null }),

	// these fire on every mouse move: only a change should reach the subscribers
	setHover: id => { if (get().hoverId !== id) set({ hoverId: id }); },

	toggleType: type => set(state => ({
		hiddenTypes: state.hiddenTypes.includes(type)
			? state.hiddenTypes.filter(hidden => hidden !== type)
			: [...state.hiddenTypes, type]
	})),
	setLabels: labels => set({ labels }),
	setInView: inView => set({ inView }),
	setView: view => set({ view }),
	reset: () => set({ selectedId: null, hiddenTypes: [], inView: false })
}));
