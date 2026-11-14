"use client";

import { cn } from "cnfast";
import { memo, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, MousePointerClick, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PreferredRouteType } from "@skywatch/gateway/schemas";
import { CopyButton } from "~/components/ui/copy-button";
import { Skeleton } from "~/components/ui/skeleton";
import { routeKey, typeColor, type RouteResult } from "./geo";
import { Leg } from "./leg";
import type { MapPair } from "./routing-map";
import { endpointCode, useRoutingStore, type RoutingEndpoint } from "./store";

const ROW_HEIGHT = 52;
const PAIR_ROW_HEIGHT = 40;

const typeLabel = (type: string) => PreferredRouteType[type] ?? type;

const describe = (from: RoutingEndpoint | null, to: RoutingEndpoint | null, bidirectional: boolean): React.ReactNode => {
	if (from && to) return <Leg from={endpointCode(from)} to={endpointCode(to)} both={bidirectional} />;
	if (from) return `Out of ${endpointCode(from)}`;
	if (to) return `Into ${endpointCode(to)}`;
	return "Preferred routes";
};

const RouteRow = memo(function RouteRow({ route, top }: { route: RouteResult; top: number }) {
	const key = routeKey(route);

	// per-row selectors: hovering only re-renders the rows whose own state flips
	const hovered = useRoutingStore(state => state.hover.routes.includes(key));
	const selected = useRoutingStore(state => state.selectedId === key);

	return (
		<button
			type="button"
			onMouseEnter={() => useRoutingStore.getState().setHover({ routes: [key], source: "list" })}
			onMouseLeave={() => useRoutingStore.getState().setHover({ routes: [], source: "list" })}
			onClick={() => useRoutingStore.getState().select(selected ? null : key)}
			aria-current={selected ? "true" : undefined}
			className={cn(
				"absolute inset-x-0 flex cursor-pointer flex-col justify-center gap-0.5 border-b border-l-2 px-3 text-left transition-colors",
				selected ? "bg-accent/60" : hovered ? "bg-accent/40" : "hover:bg-accent/30"
			)}
			style={{ top, height: ROW_HEIGHT, borderLeftColor: typeColor(route.type) }}
		>
			<div className="flex items-center justify-between gap-2">
				<Leg from={route.origin} to={route.dest} className="font-mono text-sm font-semibold tracking-tight" />
				<span className="flex items-center gap-1.5">
					{!route.complete && (
						<span title="Some fixes couldn't be placed, so the line on the map has gaps">
							<AlertTriangle className="size-3.5 text-yellow-500" />
						</span>
					)}
					<span
						className="rounded-sm px-1.5 font-mono text-[10px] leading-4"
						style={{ color: typeColor(route.type), backgroundColor: `${typeColor(route.type)}1f` }}
						title={typeLabel(route.type)}
					>
						{route.type}
					</span>
				</span>
			</div>
			<div className="truncate font-mono text-xs tracking-tighter text-muted-foreground">{route.route}</div>
		</button>
	);
});

/** A pair in the overview: its two airports, how many routes it has, and which route types. Click to drill in. */
const PairRow = memo(function PairRow({ pair, top }: { pair: MapPair & { types: Record<string, number> }; top: number }) {
	const hovered = useRoutingStore(state => state.hover.routes.includes(pair.id));

	return (
		<button
			type="button"
			onMouseEnter={() => useRoutingStore.getState().setHover({ routes: [pair.id], source: "list" })}
			onMouseLeave={() => useRoutingStore.getState().setHover({ routes: [], source: "list" })}
			onClick={() => useRoutingStore.getState().drill(pair.origin, pair.dest)}
			className={cn(
				"absolute inset-x-0 flex cursor-pointer items-center justify-between gap-2 border-b px-3 text-left transition-colors",
				hovered ? "bg-accent/40" : "hover:bg-accent/30"
			)}
			style={{ top, height: PAIR_ROW_HEIGHT }}
		>
			<Leg from={pair.origin} to={pair.dest} className="font-mono text-sm font-semibold tracking-tight" />
			<span className="flex items-center gap-2">
				<span className="flex items-center gap-1">
					{Object.entries(pair.types).map(([type, count]) => (
						<span key={type} className="size-2 rounded-full" style={{ backgroundColor: typeColor(type) }} title={`${typeLabel(type)}: ${count}`} />
					))}
				</span>
				<span className="rounded-sm bg-zinc-300 px-1.5 font-mono text-xs tabular-nums dark:bg-zinc-800">{pair.count}</span>
			</span>
		</button>
	);
});

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
	<div className="flex gap-2 text-xs">
		<span className="w-16 shrink-0 text-muted-foreground">{label}</span>
		<span className="min-w-0 wrap-anywhere font-mono">{value}</span>
	</div>
);

type TokenKind =
	/** the origin and destination */
	| "endpoint"
	/** a fix, navaid or procedure we placed on the map */
	| "fix"
	/** an airway we followed: the line runs along it */
	| "airway"
	/** an airway we couldn't follow: the line cuts straight across it */
	| "gap"
	/** a fix or procedure we couldn't place at all */
	| "unplaced";

/**
 * The route string as chips, one per token, each marked with what happened to it on the map. This one view replaces
 * listing the route string, its airways and its problems separately.
 */
const tokenChips = (route: RouteResult) => {
	const tokens = route.route.split(/\s+/).filter(Boolean);
	const gaps = new Set(route.airwayGaps);
	const airways = new Set(route.airways);
	const unplaced = new Set([...route.procedures, ...route.unresolved]);

	return tokens.map((token, index): { key: string; label: string; kind: TokenKind; points: number } => {
		const key = `${token}-${index}`;
		if (index === 0 || index === tokens.length - 1) return { key, label: token, kind: "endpoint", points: 0 };
		if (gaps.has(token)) return { key, label: token, kind: "gap", points: 0 };
		if (airways.has(token)) return { key, label: token, kind: "airway", points: route.fixes.filter(fix => fix.via === token).length };
		// "TRANSITION.PROCEDURE" tokens are looked up in two pieces
		if (token.split(".").some(part => unplaced.has(part))) return { key, label: token, kind: "unplaced", points: 0 };
		return { key, label: token, kind: "fix", points: 0 };
	});
};

const CHIP_STYLE: Record<TokenKind, string> = {
	endpoint: "bg-muted font-semibold",
	fix: "bg-muted",
	airway: "border border-dashed text-muted-foreground",
	gap: "border border-dashed border-yellow-500/60 text-yellow-600 dark:text-yellow-400",
	unplaced: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
};

const chipTitle = (chip: { label: string; kind: TokenKind; points: number }) => {
	switch (chip.kind) {
		case "airway": return `Along ${chip.label}: ${chip.points} ${chip.points === 1 ? "point" : "points"} on the map`;
		case "gap": return `Couldn't follow ${chip.label}: the line cuts straight across it`;
		case "unplaced": return `${chip.label} couldn't be placed on the map`;
		default: return undefined;
	}
};

/**
 * The selected route, in place of the list: the route string as chips (marked where the map had to cut across or skip
 * something) and its restrictions. Copy and the X are in the header; Esc also goes back to the list.
 */
const RouteDetails: React.FC<{ route: RouteResult; onClose: () => void }> = ({ route, onClose }) => (
	<div className="flex min-h-0 flex-1 flex-col">
		<div className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2">
			<div className="min-w-0">
				<div className="font-mono text-sm font-semibold tracking-tight">
					<Leg from={route.origin} to={route.dest} />
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{typeLabel(route.type)} · variant {route.sequence} · <Leg from={route.originArtcc} to={route.destArtcc} />
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<span title="Copy the route string">
					<CopyButton value={route.route} variant="ghost" size="icon-sm" iconSize="size-3.5" className="size-7 text-muted-foreground" />
				</span>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close route details"
					className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</div>
		</div>

		{/* grid-cols-1 is minmax(0, 1fr): a plain `auto` column would grow to fit its longest unbreakable string */}
		<div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto px-3 py-3">
			<div className="flex flex-wrap items-center gap-1">
				{tokenChips(route).map(chip => (
					<span
						key={chip.key}
						className={cn("max-w-full rounded-sm px-1.5 py-0.5 font-mono text-xs wrap-anywhere", CHIP_STYLE[chip.kind])}
						title={chipTitle(chip)}
					>
						{chip.label}
						{chip.kind === "airway" && <span className="ml-1 text-muted-foreground/70">{chip.points}</span>}
					</span>
				))}
			</div>

			{(route.airwayGaps.length > 0 || route.procedures.length > 0 || route.unresolved.length > 0) && (
				<div className="text-xs text-yellow-600 dark:text-yellow-400">
					Highlighted tokens couldn&apos;t be followed or placed, so the line on the map cuts straight across them.
				</div>
			)}

			{(route.altitude || route.aircraft || route.hours.length > 0 || route.direction || route.area) && (
				<div className="grid gap-1 border-t pt-3">
					{route.altitude && <Detail label="Altitude" value={route.altitude} />}
					{route.aircraft && <Detail label="Aircraft" value={route.aircraft} />}
					{route.hours.length > 0 && <Detail label="Hours" value={route.hours.join(", ")} />}
					{route.direction && <Detail label="Direction" value={route.direction} />}
					{route.area && <Detail label="Area" value={route.area} />}
				</div>
			)}
		</div>
	</div>
);

type Props = {
	view: "routes" | "pairs";
	/** routes to list in the routes view (type / completeness filters already applied) */
	routes: RouteResult[];
	/** pairs to list in the pairs view (type filters already applied; `types` holds the visible types only) */
	pairs: Array<MapPair & { types: Record<string, number> }>;
	/** matching routes on the server, before its limit */
	total: number;
	truncated: boolean;
	loading: boolean;
	/** showing the previous search's routes while the next one loads */
	stale: boolean;
	error: Error | null;
	retry: () => void;
};

/** Floating list over the map. A sibling of <Map>, not a child, so scrolling it never zooms the map. */
export const RouteList: React.FC<Props> = ({ view, routes, pairs, total, truncated, loading, stale, error, retry }) => {
	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const bidirectional = useRoutingStore(state => state.bidirectional);
	const selectedId = useRoutingStore(state => state.selectedId);

	// what the list holds: route keys in the routes view, pair ids in the pairs view
	const ids = useMemo(
		() => view === "pairs" ? pairs.map(pair => pair.id) : routes.map(routeKey),
		[view, routes, pairs]
	);

	const rowHeight = view === "pairs" ? PAIR_ROW_HEIGHT : ROW_HEIGHT;
	const scrollRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: ids.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: 8
	});

	// Hovering a line on the map brings its row into view. Only hovers that started on the map: scrolling the list
	// out from under the cursor while the cursor is on the list would be maddening. Brief delay so a sweep across the
	// map doesn't make the list thrash.
	const mapHoveredId = useRoutingStore(state => state.hover.source === "map" ? (state.hover.routes[0] ?? null) : null);
	useEffect(() => {
		// no scroll element while the route details replace the list
		if (!mapHoveredId || !scrollRef.current) return;
		const index = ids.indexOf(mapHoveredId);
		if (index === -1) return;

		const timer = setTimeout(() => virtualizer.scrollToIndex(index, { align: "auto" }), 60);
		return () => clearTimeout(timer);
	}, [mapHoveredId, ids, virtualizer]);

	// Closing the details brings the list back at the route that was open, not at the top.
	// (While a route is open the list isn't mounted, so there's nothing to scroll.)
	const openKey = useRef<string | null>(null);
	useEffect(() => {
		if (selectedId) {
			openKey.current = selectedId;
			return;
		}

		const key = openKey.current;
		openKey.current = null;
		const index = key ? ids.indexOf(key) : -1;
		if (index === -1) return;

		// give the list a frame to remount before scrolling it
		const frame = requestAnimationFrame(() => virtualizer.scrollToIndex(index, { align: "center" }));
		return () => cancelAnimationFrame(frame);
	}, [selectedId, ids, virtualizer]);

	// the route to show in place of the list (a selected route the type filters hide isn't on the map, so it isn't shown)
	const selected = routes.find(route => routeKey(route) === selectedId);
	const hasSearch = Boolean(from || to);
	const items = ids.length;

	const sizing = selected
		// the details hug their content, up to the height of the map
		? "max-h-[55%] lg:bottom-auto lg:max-h-[calc(100%-1rem)]"
		: "h-[38%] lg:h-auto";

	return (
		<aside
			className={cn(
				"absolute inset-x-2 bottom-2 z-10 flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur transition-opacity lg:inset-x-auto lg:top-2 lg:left-2 lg:w-80",
				sizing,
				stale && "opacity-60"
			)}
		>
			{selected ? (
				<RouteDetails route={selected} onClose={() => useRoutingStore.getState().select(null)} />
			) : (
				<>
					<div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
						<span className="font-mono text-sm font-semibold tracking-tight">{describe(from, to, bidirectional)}</span>
						{hasSearch && !loading && (
							<div className="flex items-center rounded-sm bg-zinc-300 px-2 font-mono text-sm tabular-nums dark:bg-zinc-800">
								{items.toLocaleString()}
							</div>
						)}
					</div>

					{hasSearch && !loading && !error && view === "pairs" && items > 0 && (
						<div className="shrink-0 border-b px-3 py-1.5 text-xs text-muted-foreground">
							Overview: {total.toLocaleString()} routes across {items.toLocaleString()} pairs. Click a pair to see its routes.
						</div>
					)}

					{!hasSearch && (
						<div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center text-sm text-muted-foreground">
							<MousePointerClick className="size-6" />
							<div>Click an airport or a center on the map to see its preferred routes.</div>
							<div className="text-xs">Click another to narrow it to routes between the two.</div>
						</div>
					)}

					{hasSearch && loading && (
						<div className="flex flex-col gap-px p-px">
							{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="rounded-none" style={{ height: ROW_HEIGHT }} />)}
						</div>
					)}

					{hasSearch && !loading && error && (
						<div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center text-sm">
							<div>Couldn&apos;t load routes.</div>
							<button type="button" onClick={retry} className="cursor-pointer text-xs underline underline-offset-4">Try again</button>
						</div>
					)}

					{hasSearch && !loading && !error && items === 0 && (
						<div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
							No preferred routes for this search{total > 0 ? " with the current filters" : ""}.
						</div>
					)}

					{hasSearch && !loading && !error && items > 0 && (
						<>
							<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
								<div className="relative" style={{ height: virtualizer.getTotalSize() }}>
									{virtualizer.getVirtualItems().map(item => view === "pairs"
										? <PairRow key={pairs[item.index].id} pair={pairs[item.index]} top={item.start} />
										: <RouteRow key={ids[item.index]} route={routes[item.index]} top={item.start} />
									)}
								</div>
							</div>

							{view === "routes" && truncated && (
								<div className="shrink-0 border-t px-3 py-1.5 text-xs text-muted-foreground">
									Showing the first {routes.length.toLocaleString()} of {total.toLocaleString()} routes. Narrow the search to see the rest.
								</div>
							)}
						</>
					)}
				</>
			)}
		</aside>
	);
};
