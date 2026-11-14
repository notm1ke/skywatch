import { create } from "zustand";

/** One end of a search: a single airport (IATA) or a whole ARTCC. Same shape the gateway takes. */
export type RoutingEndpoint = { airport: string } | { artcc: string };

export type RoutingSlot = "from" | "to";

export const endpointCode = (endpoint: RoutingEndpoint) =>
	"airport" in endpoint ? endpoint.airport : endpoint.artcc;

export const isAirport = (endpoint: RoutingEndpoint | null): endpoint is { airport: string } =>
	Boolean(endpoint && "airport" in endpoint);

const sameAirport = (a: RoutingEndpoint | null, b: RoutingEndpoint | null) =>
	isAirport(a) && isAirport(b) && a.airport === b.airport;

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

/** auto picks pairs for big searches and routes for small ones; the user can force either */
export type ViewMode = "auto" | "routes" | "pairs";

type Hover = {
	airport: string | null;
	/**
	 * every route (or pair, in the pairs view) under the cursor: routes share segments, so there can be several.
	 * Route ids are route keys, see `routeKey` in geo.ts.
	 */
	routes: string[];
	artcc: string | null;
	/** where the hover came from: the list only scrolls to hovers that started on the map */
	source: "map" | "list";
};

type RoutingState = {
	from: RoutingEndpoint | null;
	to: RoutingEndpoint | null;
	/**
	 * The slot the next map click fills. It advances after every pick, so clicks alternate
	 * From, To, From, ...; clicking a slot in the bar arms it directly.
	 */
	armed: RoutingSlot;
	bidirectional: boolean;
	/** types switched off (rather than types switched on, so a type we haven't seen yet shows by default) */
	hiddenTypes: string[];
	completeOnly: boolean;
	viewMode: ViewMode;

	/** the selected route's key (see `routeKey` in geo.ts) */
	selectedId: string | null;
	hover: Hover;

	pick: (endpoint: RoutingEndpoint) => void;
	/** turn a pair into a search: From its origin airport, To its destination airport */
	drill: (origin: string, dest: string) => void;
	arm: (slot: RoutingSlot) => void;
	clear: (slot?: RoutingSlot) => void;
	swap: () => void;
	setViewMode: (mode: ViewMode) => void;
	setBidirectional: (value: boolean) => void;
	toggleType: (type: string) => void;
	setCompleteOnly: (value: boolean) => void;
	select: (id: string | null) => void;
	setHover: (hover: Partial<Hover>) => void;
};

const noHover: Hover = { airport: null, routes: [], artcc: null, source: "map" };

export const useRoutingStore = create<RoutingState>((set) => ({
	from: null,
	to: null,
	armed: "from",
	bidirectional: false,
	hiddenTypes: [],
	completeOnly: false,
	viewMode: "auto",
	selectedId: null,
	hover: noHover,

	pick: endpoint => set(state => {
		const slot = state.armed;
		const other = slot === "from" ? state.to : state.from;

		// an airport can't be both ends (an ARTCC can: routes within a center are real)
		if (sameAirport(other, endpoint)) return state;

		return {
			[slot]: endpoint,
			armed: slot === "from" ? "to" : "from",
			selectedId: null
		} as Partial<RoutingState>;
	}),

	// drilling into a pair is a fresh, small search, so the view goes back to automatic
	drill: (origin, dest) => set({
		from: { airport: origin },
		to: { airport: dest },
		armed: "from",
		viewMode: "auto",
		selectedId: null,
		hover: noHover
	}),

	arm: armed => set({ armed }),

	clear: slot => set(() => {
		if (!slot) return { from: null, to: null, armed: "from", viewMode: "auto", selectedId: null, hover: noHover };
		return { [slot]: null, armed: slot, selectedId: null } as Partial<RoutingState>;
	}),

	swap: () => set(state => ({ from: state.to, to: state.from, selectedId: null })),

	setViewMode: viewMode => set({ viewMode }),

	setBidirectional: bidirectional => set({ bidirectional, selectedId: null }),

	toggleType: type => set(state => ({
		hiddenTypes: state.hiddenTypes.includes(type)
			? state.hiddenTypes.filter(hidden => hidden !== type)
			: [...state.hiddenTypes, type]
	})),

	setCompleteOnly: completeOnly => set({ completeOnly }),

	select: selectedId => set({ selectedId }),

	// hover fires on every mouse move: only touch state when something actually changed
	setHover: partial => set(state => {
		const next = { ...state.hover, ...partial };
		const unchanged = next.airport === state.hover.airport
			&& next.artcc === state.hover.artcc
			&& next.source === state.hover.source
			&& sameList(next.routes, state.hover.routes);

		return unchanged ? state : { hover: next };
	})
}));
