"use client";

import { useEffect, useMemo } from "react";
import { orpc } from "~/lib/gateway";
import { FilterBar } from "./filter-bar";
import { HoverHint } from "./hover-hint";
import { RouteList } from "./route-list";
import { RoutingMap } from "./routing-map";
import { useRoutingStore } from "./store";
import { useAirports } from "~/components/airport-provider";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { RouteResult } from "./geo";

const NO_ROUTES: RouteResult[] = [];

// the biggest real search (an ARTCC to anywhere) is ~2.7k routes; this is the gateway's maximum
const LIMIT = 3000;

/**
 * Map-driven preferred route explorer. Click an airport or center to set From, click another to set To.
 * Every matching route is drawn faintly; hovering one (on the map or in the list) lights it up.
 */
export const RoutingTab = () => {
	const { airports } = useAirports();

	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const bidirectional = useRoutingStore(state => state.bidirectional);
	const hiddenTypes = useRoutingStore(state => state.hiddenTypes);
	const completeOnly = useRoutingStore(state => state.completeOnly);

	const coverage = useQuery({
		...orpc.airspace.routing.coverage.queryOptions(),
		staleTime: 10 * 60 * 1000
	});

	const enabled = Boolean(from || to);
	const search = useQuery({
		...orpc.airspace.routing.search.queryOptions({
			input: { from: from ?? undefined, to: to ?? undefined, bidirectional, limit: LIMIT }
		}),
		enabled,
		// keep the previous routes on screen while the next search loads, instead of flashing an empty map
		placeholderData: keepPreviousData
	});

	// with keepPreviousData the last result lingers after the search is cleared, so only read it while a search is active
	const result = enabled ? search.data : undefined;
	const all = result?.routes ?? NO_ROUTES;

	const routes = useMemo(
		() => all.filter(route => !hiddenTypes.includes(route.type) && (!completeOnly || route.complete)),
		[all, hiddenTypes, completeOnly]
	);

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

	const loading = enabled && search.isLoading;

	return (
		<div className="flex h-(--page-height) flex-col">
			<div className="relative min-h-0 flex-1">
				<RoutingMap
					routes={routes}
					frameKey={result ?? null}
					coverage={coverage.data}
					airports={airports}
				/>

				<HoverHint routes={routes} coverage={coverage.data} airports={airports} />

				<RouteList
					routes={routes}
					total={result?.total ?? 0}
					truncated={result?.truncated ?? false}
					loading={loading}
					stale={enabled && search.isPlaceholderData}
					error={enabled ? search.error : null}
					retry={() => search.refetch()}
				/>
			</div>

			<FilterBar routes={all} visible={routes.length} loading={loading} />
		</div>
	);
};
