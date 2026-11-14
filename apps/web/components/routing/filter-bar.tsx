"use client";

import { cn } from "cnfast";
import { ArrowLeftRight, Network, Repeat, Route, X } from "lucide-react";
import { PreferredRouteType } from "@skywatch/gateway/schemas";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { typeColor } from "./geo";
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

/** What the FAA means by each route type code, in plain words. Codes we have no wording for just show their label. */
const TYPE_HELP: Record<string, string> = {
	H: "Preferred routes for aircraft flying high altitude, on jet routes (J-airways) and direct fixes.",
	L: "Preferred routes for aircraft flying low altitude, mostly on Victor airways (V-airways).",
	TEC: "Tower Enroute Control: short routes between nearby airports that stay inside approach control airspace, so flights never talk to a center.",
	SLD: "Special low altitude routes that only apply in one direction, usually to deconflict with other traffic.",
	SHD: "Special high altitude routes that only apply in one direction, usually to deconflict with other traffic.",
	LSD: "Low altitude routes that only apply in one direction.",
	HSD: "High altitude routes that only apply in one direction."
};

/** A tooltip with a title, an explanation and an optional note about the current state. Opens on top: the bar is at the bottom. */
const Hint: React.FC<{
	title: React.ReactNode;
	body: React.ReactNode;
	note?: React.ReactNode;
	children: React.ReactElement;
}> = ({ title, body, note, children }) => (
	<Tooltip delayDuration={300}>
		<TooltipTrigger asChild>{children}</TooltipTrigger>
		<TooltipContent side="top" sideOffset={6} className="grid max-w-72 gap-1 px-3 py-2 text-left">
			<div className="flex items-center gap-2 text-sm font-semibold">{title}</div>
			<div className="text-background/80">{body}</div>
			{note && <div className="mt-0.5 border-t border-background/20 pt-1.5 text-background/60">{note}</div>}
		</TooltipContent>
	</Tooltip>
);

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
	/** the view being shown: chosen automatically for big searches, or forced with the toggle */
	view: "routes" | "pairs";
	/** routes per type for the chips, before the type filters (so the counts stay put when a chip is toggled off) */
	typeCounts: Array<[string, number]>;
	/** routes with gaps; only meaningful in the routes view, where each route's placement is known */
	incomplete: number;
	/** routes showing after the filters / routes the search matched */
	visible: number;
	total: number;
	loading: boolean;
};

export const FilterBar: React.FC<Props> = ({ view, typeCounts, incomplete, visible, total, loading }) => {
	const from = useRoutingStore(state => state.from);
	const to = useRoutingStore(state => state.to);
	const bidirectional = useRoutingStore(state => state.bidirectional);
	const hiddenTypes = useRoutingStore(state => state.hiddenTypes);
	const completeOnly = useRoutingStore(state => state.completeOnly);
	const { swap, setBidirectional, setViewMode, toggleType, setCompleteOnly, clear } = useRoutingStore.getState();

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

			<Hint
				title="Both ways"
				body="Also include routes flying the opposite direction. Without it, From is always the origin and To is always the destination."
				note={bidirectional ? "On: the search matches both directions." : "Off: only From to To."}
			>
				<Toggle pressed={bidirectional} onClick={() => setBidirectional(!bidirectional)}>
					<Repeat className="size-3.5" />
					Both ways
				</Toggle>
			</Hint>

			{/* big searches open as an overview of pairs; click Routes to draw every route anyway */}
			<Hint
				title="Routes"
				body="Draw every preferred route along its fixes and airways. Hover one to light it up, click to open its details."
				note={view === "routes" ? "Showing now." : "Big searches open as pairs; this draws every route anyway, which can be slow and busy."}
			>
				<Toggle pressed={view === "routes"} onClick={() => setViewMode("routes")}>
					<Route className="size-3.5" />
					Routes
				</Toggle>
			</Hint>
			<Hint
				title="Pairs"
				body="One line per origin and destination, with a count of how many routes connect them. Click a pair to drill into just its routes."
				note={view === "pairs" ? "Showing now." : "Opens automatically when a search matches more than 400 routes."}
			>
				<Toggle pressed={view === "pairs"} onClick={() => setViewMode("pairs")}>
					<Network className="size-3.5" />
					Pairs
				</Toggle>
			</Hint>

			{typeCounts.map(([type, count]) => {
				const hidden = hiddenTypes.includes(type);
				return (
					<Hint
						key={type}
						title={
							<>
								<span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: typeColor(type) }} />
								{PreferredRouteType[type] ?? type}
								<span className="font-mono text-xs font-normal text-background/60">{type}</span>
							</>
						}
						body={TYPE_HELP[type] ?? "An FAA preferred route type we don't have a description for yet."}
						note={`${count.toLocaleString()} ${count === 1 ? "route" : "routes"} in this search. Click to ${hidden ? "show" : "hide"} them.`}
					>
						<Toggle pressed={!hidden} onClick={() => toggleType(type)} className={cn(hidden && "opacity-50")}>
							<span className="size-2 rounded-full" style={{ backgroundColor: typeColor(type) }} />
							<span className="font-mono">{type}</span>
							<span className="font-mono text-xs tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
						</Toggle>
					</Hint>
				);
			})}

			{view === "routes" && incomplete > 0 && (
				<Hint
					title="Complete only"
					body="Hide routes with a fix or airway we couldn't place on the map. Those routes are still drawn, but with dashed lines that skip the missing pieces."
					note={`${incomplete.toLocaleString()} ${incomplete === 1 ? "route has" : "routes have"} gaps in this search. ${completeOnly ? "Click to show them again." : "Click to hide them."}`}
				>
					<Toggle pressed={completeOnly} onClick={() => setCompleteOnly(!completeOnly)}>
						Complete only
						<span className="font-mono text-xs tabular-nums text-muted-foreground">-{incomplete.toLocaleString()}</span>
					</Toggle>
				</Hint>
			)}

			<div className="ml-auto flex h-full shrink-0 items-center gap-3 border-l-0 px-3 text-xs text-muted-foreground">
				{hasSearch && !loading && (
					<span className="font-mono tabular-nums">
						{visible.toLocaleString()}{visible !== total && <> of {total.toLocaleString()}</>} routes
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
