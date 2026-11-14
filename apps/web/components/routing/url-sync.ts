import { useEffect } from "react";
import { useRoutingStore, type RoutingEndpoint, type ViewMode } from "./store";

/**
 * Keeps the search in the URL so it can be shared: /routing?from=airport:ORD&to=artcc:ZNY&both=1&route=ORD.ABE.H.1
 *
 *   from / to   airport:ORD or artcc:ZNY
 *   both        1 = both directions
 *   hide        route types switched off, comma separated
 *   complete    1 = only routes we could fully place
 *   view        routes | pairs (only when forced; otherwise it's automatic)
 *   route       the selected route's key (see `routeKey` in geo.ts)
 *
 * Uses history.replaceState rather than the Next router: nothing needs to re-render or refetch when the URL changes,
 * and a search shouldn't add a history entry per click.
 */

const ENDPOINT = /^(airport|artcc):([A-Za-z]{3})$/;
const TYPE = /^[A-Z]{1,4}$/;
const ROUTE_KEY = /^[A-Z0-9]{3}\.[A-Z0-9]{3}\.[A-Z]{1,4}\.\d+$/;

const parseEndpoint = (value: string | null): RoutingEndpoint | null => {
	const match = value?.match(ENDPOINT);
	if (!match) return null;

	const code = match[2].toUpperCase();
	return match[1] === "airport" ? { airport: code } : { artcc: code };
};

const formatEndpoint = (endpoint: RoutingEndpoint | null) => {
	if (!endpoint) return null;
	return "airport" in endpoint ? `airport:${endpoint.airport}` : `artcc:${endpoint.artcc}`;
};

const parseView = (value: string | null): ViewMode => value === "routes" || value === "pairs" ? value : "auto";

type Synced = ReturnType<typeof useRoutingStore.getState>;

const toSearch = (state: Synced) => {
	// without an endpoint there's no search: keep the URL clean
	if (!state.from && !state.to) return "";

	const params = new URLSearchParams();
	const from = formatEndpoint(state.from);
	const to = formatEndpoint(state.to);

	if (from) params.set("from", from);
	if (to) params.set("to", to);
	if (state.bidirectional) params.set("both", "1");
	if (state.hiddenTypes.length) params.set("hide", state.hiddenTypes.join(","));
	if (state.completeOnly) params.set("complete", "1");
	if (state.viewMode !== "auto") params.set("view", state.viewMode);
	if (state.selectedId) params.set("route", state.selectedId);

	// keep the colons readable
	return params.toString().replace(/%3A/g, ":").replace(/%2C/g, ",");
};

const changed = (a: Synced, b: Synced) =>
	a.from !== b.from
	|| a.to !== b.to
	|| a.bidirectional !== b.bidirectional
	|| a.hiddenTypes !== b.hiddenTypes
	|| a.completeOnly !== b.completeOnly
	|| a.viewMode !== b.viewMode
	|| a.selectedId !== b.selectedId;

export const useRoutingUrlSync = () => {
	useEffect(() => {
		// 1. restore a shared search
		const params = new URLSearchParams(window.location.search);
		const from = parseEndpoint(params.get("from"));
		const to = parseEndpoint(params.get("to"));

		if (from || to) {
			const route = params.get("route");

			useRoutingStore.setState({
				from,
				to,
				// the next click fills whichever end is still empty
				armed: from && !to ? "to" : "from",
				bidirectional: params.get("both") === "1",
				hiddenTypes: (params.get("hide") ?? "").split(",").filter(type => TYPE.test(type)),
				completeOnly: params.get("complete") === "1",
				viewMode: parseView(params.get("view")),
				selectedId: route && ROUTE_KEY.test(route) ? route : null
			});
		}

		// 2. from here on, keep the URL in step with the search
		return useRoutingStore.subscribe((state, previous) => {
			if (!changed(state, previous)) return;

			const search = toSearch(state);
			const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
			const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
			if (next !== current) window.history.replaceState(window.history.state, "", next);
		});
	}, []);
};
