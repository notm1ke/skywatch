"use client";

import { cn } from "cnfast";
import { useMemo } from "react";
import { ArrowLeftRight, Repeat, X } from "lucide-react";
import { PreferredRouteType } from "@skywatch/gateway/schemas";
import { typeColor, type RouteResult } from "./geo";
import { endpointCode, isAirport, useRoutingStore, type RoutingEndpoint, type RoutingSlot } from "./store";

/** The From / To slot. Highlighted when it's the one the next map click will fill. */
const Slot: React.FC<{ slot: RoutingSlot; label: string; endpoint: RoutingEndpoint | null }> = ({ slot, label, endpoint }) => {
	const armed = useRoutingStore(state => state.armed === slot);
	const { arm, clear } = useRoutingStore.getState();

	return (
		<div className={cn("flex h-full shrink-0 items-center transition-colors", armed && "bg-accent/60")}>
			<button
				type="button"
				onClick={() => arm(slot)}
				className="flex h-full cursor-pointer items-center gap-2 pr-1 pl-3 text-sm"
				title={armed ? "The next map click fills this" : "Click, then pick on the map"}
			>
				<span className="text-xs text-muted-foreground">{label}</span>
				{endpoint ? (
					<span className="font-mono font-semibold tracking-tight">
						{endpointCode(endpoint)}
						{!isAirport(endpoint) && <span className="ml-1 text-xs font-normal text-muted-foreground">center</span>}
					</span>
				) : (
					<span className={cn("text-xs", armed ? "text-foreground" : "text-muted-foreground")}>
						{armed ? "pick on map" : "any"}
					</span>
				)}
			</button>

			<button
				type="button"
				onClick={() => clear(slot)}
				disabled={!endpoint}
				aria-label={`Clear ${label}`}
				className="mr-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors enabled:hover:bg-accent enabled:hover:text-foreground disabled:cursor-default disabled:opacity-30"
			>
				<X className="size-3.5" />
			</button>
		</div>
	);
};

const Toggle: React.FC<React.ComponentProps<"button"> & { pressed: boolean }> = ({ pressed, className, ...props }) => (
	<button
		type="button"
		aria-pressed={pressed}
		className={cn(
			"flex h-full shrink-0 cursor-pointer items-center gap-1.5 px-3 text-sm transition-colors hover:bg-accent/40",
			pressed ? "bg-accent/60 text-foreground" : "text-muted-foreground",
			className
		)}
		{...props}
	/>
);

type Props = {
	/** every route the search returned, before the type / completeness filters (so the chip counts stay put) */
	routes: RouteResult[];
	visible: number;
	loading: boolean;
};

export const FilterBar: React.FC<Props> = ({ routes, visible, loading }) => {
	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const bidirectional = useRoutingStore(state => state.bidirectional);
	const hiddenTypes = useRoutingStore(state => state.hiddenTypes);
	const completeOnly = useRoutingStore(state => state.completeOnly);
	const { swap, setBidirectional, toggleType, setCompleteOnly, clear } = useRoutingStore.getState();

	const counts = useMemo(() => {
		const byType = new Map<string, number>();
		for (const route of routes) byType.set(route.type, (byType.get(route.type) ?? 0) + 1);
		return [...byType.entries()].sort((a, b) => b[1] - a[1]);
	}, [routes]);

	const incomplete = useMemo(() => routes.filter(route => !route.complete).length, [routes]);
	const hasSearch = Boolean(from || to);

	return (
		<div className="flex h-10 shrink-0 divide-x overflow-x-auto border-t bg-background text-sm">
			<Slot slot="from" label="From" endpoint={from} />

			<button
				type="button"
				onClick={swap}
				disabled={!from && !to}
				aria-label="Swap From and To"
				className="flex h-full shrink-0 cursor-pointer items-center px-3 text-muted-foreground transition-colors enabled:hover:bg-accent/40 enabled:hover:text-foreground disabled:cursor-default disabled:opacity-30"
			>
				<ArrowLeftRight className="size-4" />
			</button>

			<Slot slot="to" label="To" endpoint={to} />

			<Toggle pressed={bidirectional} onClick={() => setBidirectional(!bidirectional)} title="Also show routes in the opposite direction">
				<Repeat className="size-3.5" />
				Both ways
			</Toggle>

			{counts.map(([type, count]) => {
				const hidden = hiddenTypes.includes(type);
				return (
					<Toggle
						key={type}
						pressed={!hidden}
						onClick={() => toggleType(type)}
						title={`${PreferredRouteType[type] ?? type}: click to ${hidden ? "show" : "hide"}`}
						className={cn(hidden && "opacity-50")}
					>
						<span className="size-2 rounded-full" style={{ backgroundColor: typeColor(type) }} />
						<span className="font-mono">{type}</span>
						<span className="font-mono text-xs tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
					</Toggle>
				);
			})}

			{incomplete > 0 && (
				<Toggle pressed={completeOnly} onClick={() => setCompleteOnly(!completeOnly)} title="Hide routes with fixes we couldn't place">
					Complete only
					<span className="font-mono text-xs tabular-nums text-muted-foreground">-{incomplete.toLocaleString()}</span>
				</Toggle>
			)}

			<div className="ml-auto flex h-full shrink-0 items-center gap-3 border-l-0 px-3 text-xs text-muted-foreground">
				{hasSearch && !loading && (
					<span className="font-mono tabular-nums">
						{visible.toLocaleString()}{visible !== routes.length && <> of {routes.length.toLocaleString()}</>} routes
					</span>
				)}
				<button
					type="button"
					onClick={() => clear()}
					disabled={!hasSearch}
					className="cursor-pointer underline-offset-4 enabled:hover:text-foreground enabled:hover:underline disabled:cursor-default disabled:opacity-30"
				>
					Clear
				</button>
			</div>
		</div>
	);
};
