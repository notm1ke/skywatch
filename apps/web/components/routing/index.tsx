"use client";

import { useEffect, useMemo } from "react";
import { orpc } from "~/lib/gateway";
import { FilterBar } from "./filter-bar";
import { HoverHint } from "./hover-hint";
import { RouteList } from "./route-list";
import { RoutingMap } from "./routing-map";
import { useRoutingStore } from "./store";
import { useRoutingUrlSync } from "./url-sync";
import { useAirports } from "~/components/airport-provider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { routeKey, type Pair, type RouteResult } from "./geo";

const NO_ROUTES: RouteResult[] = [];
const NO_PAIRS: Pair[] = [];

// the biggest real search (an ARTCC to anywhere) is ~2.7k routes; this is the gateway's maximum
const LIMIT = 3000;

/**
 * Above this many matching routes the page opens as an overview of origin -> destination pairs instead of drawing
 * every route. The biggest single-airport search is ~275 routes, so airports always show their routes.
 */
const OVERVIEW_THRESHOLD = 400;

/**
 * Map-driven preferred route explorer. Click an airport or center to set From, click another to set To.
 * Every matching route is drawn faintly; hovering one (on the map or in the list) lights it up.
 * Big searches open as an overview of pairs; click a pair to drill into its routes.
 */
export const RoutingTab = () => {
	useRoutingUrlSync();
	const { airports } = useAirports();

	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const bidirectional = useRoutingStore(state => state.bidirectional);
	const hiddenTypes = useRoutingStore(state => state.hiddenTypes);
	const completeOnly = useRoutingStore(state => state.completeOnly);
	const viewMode = useRoutingStore(state => state.viewMode);
	const selectedId = useRoutingStore(state => state.selectedId);

	const coverage = useQuery({
		...orpc.airspace.routing.coverage.queryOptions(),
		staleTime: 10 * 60 * 1000
	});

	const enabled = Boolean(from || to);
	const searchInput = { from: from ?? undefined, to: to ?? undefined, bidirectional };

	// The overview comes first: it's one cheap grouped query, and it tells us how big the search is before we decide
	// whether to fetch (and draw) every route.
	const pairsQuery = useQuery({
		...orpc.airspace.routing.pairs.queryOptions({ input: searchInput }),
		enabled,
		placeholderData: keepPreviousData
	});

	// with keepPreviousData the last result lingers after the search is cleared, so only read it while a search is active
	const pairsResult = enabled ? pairsQuery.data : undefined;
	const matched = pairsResult?.total ?? 0;

	const view: "routes" | "pairs" = viewMode === "auto"
		? (matched > OVERVIEW_THRESHOLD ? "pairs" : "routes")
		: viewMode;

	// don't fetch routes off a stale overview: it could be the previous (small) search deciding for a big new one
	const routesWanted = enabled && view === "routes" && Boolean(pairsResult) && !pairsQuery.isPlaceholderData;
	const search = useQuery({
		...orpc.airspace.routing.search.queryOptions({ input: { ...searchInput, limit: LIMIT } }),
		enabled: routesWanted,
		placeholderData: keepPreviousData
	});

	const result = routesWanted ? search.data : undefined;
	const all = result?.routes ?? NO_ROUTES;

	const routes = useMemo(
		() => all.filter(route => !hiddenTypes.includes(route.type) && (!completeOnly || route.complete)),
		[all, hiddenTypes, completeOnly]
	);

	// pairs with the hidden route types taken out; pairs left with no routes drop off
	const allPairs = pairsResult?.pairs ?? NO_PAIRS;
	const pairs = useMemo(() => allPairs.flatMap(pair => {
		const types = Object.fromEntries(Object.entries(pair.types).filter(([type]) => !hiddenTypes.includes(type)));
		const count = Object.values(types).reduce((sum, n) => sum + n, 0);
		return count > 0 ? [{ id: pair.id, origin: pair.origin, dest: pair.dest, count, types }] : [];
	}), [allPairs, hiddenTypes]);

	// chip counts come from the overview in both views: it's complete and arrives first
	const typeCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const pair of allPairs) {
			for (const [type, count] of Object.entries(pair.types)) counts.set(type, (counts.get(type) ?? 0) + count);
		}

		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [allPairs]);

	const incomplete = useMemo(() => all.filter(route => !route.complete).length, [all]);
	const visible = view === "pairs" ? pairs.reduce((sum, pair) => sum + pair.count, 0) : routes.length;

	// Esc: deselect the route first, then clear the search
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			const { selectedId, select, clear } = useRoutingStore.getState();
			if (selectedId) select(null);
			else clear();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// a route key from an old link may not exist any more: drop the selection once we know that
	useEffect(() => {
		if (!selectedId || !result || search.isPlaceholderData) return;
		if (!result.routes.some(route => routeKey(route) === selectedId)) useRoutingStore.getState().select(null);
	}, [selectedId, result, search.isPlaceholderData]);

	const loading = enabled && (pairsQuery.isLoading || (routesWanted && search.isLoading));
	const stale = enabled && (pairsQuery.isPlaceholderData || (routesWanted && search.isPlaceholderData));
	const error = enabled ? (pairsQuery.error ?? (view === "routes" ? search.error : null)) : null;

	// null = no search, undefined = still loading (the map holds still), otherwise the result that was just framed
	const frameKey = !enabled ? null : (view === "pairs" ? pairsResult : result);

	return (
		<div className="flex h-(--page-height) flex-col">
			<div className="relative min-h-0 flex-1">
				<RoutingMap
					view={view}
					routes={routes}
					pairs={pairs}
					frameKey={frameKey}
					coverage={coverage.data}
					airports={airports}
				/>

				<HoverHint view={view} routes={routes} pairs={pairs} coverage={coverage.data} airports={airports} />

				<RouteList
					view={view}
					routes={routes}
					pairs={pairs}
					total={matched}
					truncated={result?.truncated ?? false}
					loading={loading}
					stale={stale}
					error={error}
					retry={() => {
						pairsQuery.refetch();
						if (routesWanted) search.refetch();
					}}
				/>
			</div>

			<FilterBar
				view={view}
				typeCounts={typeCounts}
				incomplete={incomplete}
				visible={visible}
				total={matched}
				loading={loading}
			/>
		</div>
	);
};
