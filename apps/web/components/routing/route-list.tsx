"use client";

import { cn } from "cnfast";
import { memo, useRef } from "react";
import { AlertTriangle, MousePointerClick } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PreferredRouteType } from "@skywatch/gateway/schemas";
import { CopyButton } from "~/components/ui/copy-button";
import { Skeleton } from "~/components/ui/skeleton";
import { typeColor, type RouteResult } from "./geo";
import { endpointCode, useRoutingStore, type RoutingEndpoint } from "./store";

const ROW_HEIGHT = 52;

const typeLabel = (type: string) => PreferredRouteType[type] ?? type;

const describe = (from: RoutingEndpoint | null, to: RoutingEndpoint | null, bidirectional: boolean) => {
	if (from && to) return `${endpointCode(from)} ${bidirectional ? "⇄" : "→"} ${endpointCode(to)}`;
	if (from) return `Out of ${endpointCode(from)}`;
	if (to) return `Into ${endpointCode(to)}`;
	return "Preferred routes";
};

const RouteRow = memo(function RouteRow({ route, top }: { route: RouteResult; top: number }) {
	// per-row selectors: hovering only re-renders the rows whose own state flips
	const hovered = useRoutingStore(state => state.hover.routes.includes(route.id));
	const selected = useRoutingStore(state => state.selectedId === route.id);

	return (
		<button
			type="button"
			onMouseEnter={() => useRoutingStore.getState().setHover({ routes: [route.id] })}
			onMouseLeave={() => useRoutingStore.getState().setHover({ routes: [] })}
			onClick={() => useRoutingStore.getState().select(selected ? null : route.id)}
			aria-current={selected ? "true" : undefined}
			className={cn(
				"absolute inset-x-0 flex cursor-pointer flex-col justify-center gap-0.5 border-b border-l-2 px-3 text-left transition-colors",
				selected ? "bg-accent/60" : hovered ? "bg-accent/40" : "hover:bg-accent/30"
			)}
			style={{ top, height: ROW_HEIGHT, borderLeftColor: typeColor(route.type) }}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-sm font-semibold tracking-tight">{route.origin} → {route.dest}</span>
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

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
	<div className="flex gap-2 text-xs">
		<span className="w-16 shrink-0 text-muted-foreground">{label}</span>
		<span className="min-w-0 break-words font-mono">{value}</span>
	</div>
);

/** The selected route: restrictions, what we placed and what we couldn't, and a copy button for the route string. */
const RouteDetails: React.FC<{ route: RouteResult }> = ({ route }) => (
	<div className="shrink-0 border-t bg-background">
		<div className="flex items-center justify-between gap-2 px-3 py-2">
			<div className="min-w-0">
				<div className="font-mono text-sm font-semibold">{route.origin} → {route.dest}</div>
				<div className="truncate text-xs text-muted-foreground">
					{typeLabel(route.type)} · variant {route.sequence} · {route.originArtcc} → {route.destArtcc}
				</div>
			</div>
			<CopyButton value={route.route} variant="outline" size="icon-sm" iconSize="size-3.5" />
		</div>

		<div className="grid max-h-44 gap-1 overflow-y-auto px-3 pb-3">
			<div className="break-words rounded-sm bg-muted px-2 py-1 font-mono text-xs">{route.route}</div>
			{route.altitude && <Detail label="Altitude" value={route.altitude} />}
			{route.aircraft && <Detail label="Aircraft" value={route.aircraft} />}
			{route.hours.length > 0 && <Detail label="Hours" value={route.hours.join(", ")} />}
			{route.direction && <Detail label="Direction" value={route.direction} />}
			{route.area && <Detail label="Area" value={route.area} />}
			{route.airways.length > 0 && <Detail label="Airways" value={route.airways.join(" ")} />}
			{(route.unresolved.length > 0 || route.procedures.length > 0) && (
				<Detail
					label="Unplaced"
					value={<span className="text-yellow-600 dark:text-yellow-400">{[...route.procedures, ...route.unresolved].join(" ")}</span>}
				/>
			)}
		</div>
	</div>
);

type Props = {
	/** routes to list (type / completeness filters already applied) */
	routes: RouteResult[];
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
export const RouteList: React.FC<Props> = ({ routes, total, truncated, loading, stale, error, retry }) => {
	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const bidirectional = useRoutingStore(state => state.bidirectional);
	const selectedId = useRoutingStore(state => state.selectedId);

	const scrollRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: routes.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 8
	});

	const selected = routes.find(route => route.id === selectedId);
	const hasSearch = Boolean(from || to);

	return (
		<aside
			className={cn(
				"absolute inset-x-2 bottom-2 z-10 flex h-[38%] flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur transition-opacity lg:inset-x-auto lg:top-2 lg:left-2 lg:h-auto lg:w-80",
				stale && "opacity-60"
			)}
		>
			<div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
				<span className="font-mono text-sm font-semibold tracking-tight">{describe(from, to, bidirectional)}</span>
				{hasSearch && !loading && (
					<div className="flex items-center rounded-sm bg-zinc-300 px-2 font-mono text-sm tabular-nums dark:bg-zinc-800">
						{routes.length.toLocaleString()}
					</div>
				)}
			</div>

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

			{hasSearch && !loading && !error && routes.length === 0 && (
				<div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
					No preferred routes for this search{total > 0 ? " with the current filters" : ""}.
				</div>
			)}

			{hasSearch && !loading && !error && routes.length > 0 && (
				<>
					<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
						<div className="relative" style={{ height: virtualizer.getTotalSize() }}>
							{virtualizer.getVirtualItems().map(item => (
								<RouteRow key={routes[item.index].id} route={routes[item.index]} top={item.start} />
							))}
						</div>
					</div>

					{truncated && (
						<div className="shrink-0 border-t px-3 py-1.5 text-xs text-muted-foreground">
							Showing the first {routes.length.toLocaleString()} of {total.toLocaleString()} routes. Narrow the search to see the rest.
						</div>
					)}
				</>
			)}

			{selected && <RouteDetails route={selected} />}
		</aside>
	);
};
