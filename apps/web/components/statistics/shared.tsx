"use client";

import airlineDb from "~/lib/datasets/icao-airlines.json";
import aircraftDb from "~/lib/datasets/icao-aircrafts.json";

import moment from "moment-timezone";

import { cn } from "cnfast";
import { ReactNode } from "react";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { useIsMounted } from "~/hooks/use-is-mounted";
import { Skeleton } from "~/components/ui/skeleton";
import { ErrorSection } from "~/components/error-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { gateway } from "~/lib/gateway";

/** Response types, inferred from the gateway so they can't drift from the endpoints. */
export type StatsDaily = Awaited<ReturnType<typeof gateway.statistics.daily>>;
export type StatsHeatmap = Awaited<ReturnType<typeof gateway.statistics.heatmap>>;
export type StatsCancellations = Awaited<ReturnType<typeof gateway.statistics.cancellations>>;
export type StatsMix = Awaited<ReturnType<typeof gateway.statistics.mix>>;
export type StatsCenters = Awaited<ReturnType<typeof gateway.statistics.centers>>;
export type StatsDisruptions = Awaited<ReturnType<typeof gateway.statistics.disruptions>>;
export type StatsCorridors = Awaited<ReturnType<typeof gateway.statistics.corridors>>;
export type StatsSeasons = Awaited<ReturnType<typeof gateway.statistics.seasons>>;
export type StatsDurations = Awaited<ReturnType<typeof gateway.statistics.durations>>;
export type StatsReliability = Awaited<ReturnType<typeof gateway.statistics.reliability>>;
export type StatsReference = Awaited<ReturnType<typeof gateway.statistics.reference>>;
export type StatsRegistry = Awaited<ReturnType<typeof gateway.statistics.registry>>;

// These move by a few buckets every few minutes and the gateway caches them for an hour or more: no reason to ask
// again while the page is open.
const STALE = 10 * 60 * 1000;

export const useDaily = () => useQuery({ ...orpc.statistics.daily.queryOptions(), staleTime: STALE });
export const useHeatmap = () => useQuery({ ...orpc.statistics.heatmap.queryOptions(), staleTime: STALE });
export const useCancellations = () => useQuery({ ...orpc.statistics.cancellations.queryOptions(), staleTime: STALE });
export const useMix = () => useQuery({ ...orpc.statistics.mix.queryOptions(), staleTime: STALE });
export const useCenters = () => useQuery({ ...orpc.statistics.centers.queryOptions(), staleTime: STALE });
export const useDisruptions = () => useQuery({ ...orpc.statistics.disruptions.queryOptions(), staleTime: STALE });
export const useCorridors = () => useQuery({ ...orpc.statistics.corridors.queryOptions(), staleTime: STALE });
export const useSeasons = () => useQuery({ ...orpc.statistics.seasons.queryOptions(), staleTime: STALE });
export const useDurations = () => useQuery({ ...orpc.statistics.durations.queryOptions(), staleTime: STALE });
export const useReliability = () => useQuery({ ...orpc.statistics.reliability.queryOptions(), staleTime: STALE });
// the reference data and the registry change by the week: once is enough
export const useReference = () => useQuery({ ...orpc.statistics.reference.queryOptions(), staleTime: Infinity });
export const useRegistry = () => useQuery({ ...orpc.statistics.registry.queryOptions(), staleTime: Infinity });

// --- names ---------------------------------------------------------------------------------------------------
const AIRLINES = new Map(airlineDb.map(airline => [airline.icao_code, airline.airline_name]));
const AIRCRAFT = new Map(aircraftDb.map(aircraft => [aircraft.icao_code, aircraft.model_name]));

const stripCorporate = (name: string) => name
	.replace(/\s+(Inc\.?|Co\.?|Corp\.?|Ltd\.?|LLC|S\.A\.|Airlines?|Air Lines)$/i, "")
	.trim();

/** "DAL" -> "Delta Air Lines"; a code we have no name for stays as the code */
export const airlineName = (code: string) => AIRLINES.get(code) ?? code;
export const airlineShortName = (code: string) => stripCorporate(airlineName(code));
export const hasAirlineName = (code: string) => AIRLINES.has(code);

/** "B738" -> "Boeing 737-800"; a type we have no name for stays as the code */
export const aircraftName = (type: string) => AIRCRAFT.get(type) ?? type;

/** 0.0231 -> "2.3%" */
export const percent = (fraction: number, digits = 1) => `${(fraction * 100).toFixed(digits)}%`;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Thu, Nov 12, 2026" */
export const formatDay = (date: string) => moment.utc(date).format("ddd, MMM D, YYYY");

/** 16 -> "4 PM" */
export const hourName = (hour: number) => moment.utc().hour(hour).format("h A");

// --- color ---------------------------------------------------------------------------------------------------
// the slice colors are the app's, not this page's: the airspace and airport pages draw the same treemaps
export { PALETTE, OTHERS } from "~/lib/chart-colors";

/** A heatmap cell: `strength` runs 0 to 1 from the page's own color toward sky */
export const heat = (strength: number) =>
	`color-mix(in oklab, var(--color-sky-500) ${Math.round(Math.min(1, Math.max(0, strength)) * 100)}%, var(--color-muted))`;

// --- layout --------------------------------------------------------------------------------------------------
/** The side padding every part of the page uses, so the hero and everything under it line up. */
export const GUTTER = "px-4 sm:px-[35px]";

/**
 * A topic: a serif heading like the page's own, then figures drawn straight on the page, separated by hairlines.
 * `id` is what the jump bar links to; `updated` is when the numbers in it were worked out.
 */
export const StatSection: React.FC<{ id: string; title: string; description?: ReactNode; updated?: string; children: ReactNode }> = ({
	id, title, description, updated, children
}) => (
	<section id={id} className="scroll-mt-12 border-t">
		<div className={cn(GUTTER, "flex flex-wrap items-end justify-between gap-x-6 gap-y-1 pt-10 pb-2")}>
			<div>
				<h2 className="my-0 font-serif text-3xl font-normal tracking-tight">{title}</h2>
				{description && <p className="mt-1.5 mb-0 max-w-2xl text-sm text-muted-foreground">{description}</p>}
			</div>
			{updated && <Updated at={updated} />}
		</div>
		<div className={cn(GUTTER, "divide-y")}>{children}</div>
	</section>
);

/** "Updated 12 minutes ago": when the gateway worked the numbers out (they're cached for a while, so it isn't "now") */
export const Updated: React.FC<{ at: string }> = ({ at }) => {
	const mounted = useIsMounted();
	// the page is rendered ahead of time: a time that's wrong by the time it arrives is worse than none
	if (!mounted) return null;
	return <span className="font-mono text-xs text-muted-foreground">Updated {moment(at).fromNow()}</span>;
};

// --- words ---------------------------------------------------------------------------------------------------
/**
 * Jargon, said once in plain words. The page uses the real terms and lets a dotted underline explain them, so the
 * sentences around them stay short and the people who know the words aren't talked down to.
 */
const GLOSSARY = {
	groundStop: "Flights bound for the airport are held on the ground where they left from, usually for weather or heavy traffic.",
	groundDelay: "Flights bound for the airport are given later departure times, so fewer arrive at once.",
	center: "An air route traffic control center: a regional facility that directs flights between airports across part of the country.",
	zulu: "Zulu is UTC, the time standard the FAA uses everywhere. Midnight Zulu is evening in the US.",
	tfr: "A temporary flight restriction: airspace closed to most flying for a limited time.",
	waypoint: "A named point in the sky that routes pass through.",
	navaid: "A radio beacon on the ground that pilots navigate by.",
	airway: "A published route in the sky between waypoints, like a highway.",
	preferredRoute: "A route the FAA recommends between two airports.",
	frequency: "A radio frequency for an airport's tower, ground control, weather and approach."
} as const;

export type Jargon = keyof typeof GLOSSARY;

export const Term: React.FC<{ of: Jargon; children: ReactNode }> = ({ of, children }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<span tabIndex={0} className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
				{children}
			</span>
		</TooltipTrigger>
		<TooltipContent side="top" className="max-w-64">{GLOSSARY[of]}</TooltipContent>
	</Tooltip>
);

// --- measuring -----------------------------------------------------------------------------------------------
export { useBoxSize } from "~/hooks/use-box-size";

// --- a legend that talks to its figure -----------------------------------------------------------------------
export type LegendItem = {
	key: string;
	label: string;
	/** a muted line after it */
	hint?: ReactNode;
	/** its share, 0 to 1 */
	share: number;
	color: string;
};

/** What each slice of a distribution is. Hovering (or focusing) a row picks its slice out in the figure beside it. */
export const Legend: React.FC<{ items: LegendItem[]; active: string | null; onActive: (key: string | null) => void; className?: string }> = ({
	items, active, onActive, className
}) => (
	<ul className={cn("m-0 min-w-0 list-none p-0", className)} onMouseLeave={() => onActive(null)}>
		{items.map(item => (
			<li
				key={item.key}
				tabIndex={0}
				onMouseEnter={() => onActive(item.key)}
				onFocus={() => onActive(item.key)}
				onBlur={() => onActive(null)}
				className={cn(
					"flex items-center gap-2.5 rounded-sm py-[3px] text-sm outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring/60",
					active && active !== item.key && "opacity-40"
				)}
			>
				<span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} />
				<span className="shrink-0 font-mono font-medium">{item.label}</span>
				{item.hint && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.hint}</span>}
				<span className={cn("shrink-0 font-mono text-xs text-muted-foreground tabular-nums", item.hint ? "ml-auto" : "ml-auto flex-1 text-right")}>
					{percent(item.share)}
				</span>
			</li>
		))}
	</ul>
);

/** One or two figures side by side (stacked on a phone). */
export const FigureRow: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
	<div className={cn("grid gap-x-14 gap-y-12 py-10 lg:grid-cols-2", className)}>{children}</div>
);

/** A figure: a small mono heading like the hero's, then whatever it draws. */
export const Figure: React.FC<{ kicker: string; children: ReactNode; className?: string }> = ({ kicker, children, className }) => (
	<div className={cn("min-w-0", className)}>
		<h3 className="my-0 mb-1.5 font-mono text-sm font-medium tracking-tight text-zinc-900 uppercase dark:text-zinc-100">{kicker}</h3>
		{children}
	</div>
);

/** The sentence under a figure's heading that says what to see in it. Numbers in it go in `Num`. */
export const Takeaway: React.FC<{ children: ReactNode }> = ({ children }) => (
	<p className="mt-0 mb-5 max-w-prose text-sm leading-relaxed text-muted-foreground">{children}</p>
);

export const Num: React.FC<{ children: ReactNode }> = ({ children }) => (
	<span className="font-mono font-medium text-foreground tabular-nums">{children}</span>
);

/** The line under a figure saying what it's of and how to read it. */
export const Note: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
	<p className={cn("mt-3 mb-0 max-w-prose text-xs leading-relaxed text-muted-foreground", className)}>{children}</p>
);

/** What a figure shows while its data loads and if it can't: a block the size of the figure, or the shared error. */
export const FigureBody = <T,>({
	query,
	height,
	title,
	children
}: {
	query: { data: T | undefined; isLoading: boolean; error: Error | null; refetch: () => unknown };
	height: number;
	title: string;
	children: (data: T) => ReactNode;
}) => {
	if (query.isLoading) return <Skeleton className="w-full rounded-md" style={{ height }} />;
	if (query.error || !query.data) return <ErrorSection title={title} error={query.error?.message} refresh={() => query.refetch()} />;
	return <>{children(query.data)}</>;
};

export { CursorTip, TipTitle, TipHeading, TipText, TipLine } from "~/components/ui/cursor-tip";

/** "fewer ▬▬ more": the color scale of a heatmap */
export const HeatLegend: React.FC<{ low?: string; high?: string }> = ({ low = "fewer", high = "more" }) => (
	<span className="inline-flex items-center gap-1.5">
		{low}
		<span className="inline-block h-2 w-16 rounded-sm" style={{ background: "linear-gradient(to right, var(--color-muted), var(--color-sky-500))" }} />
		{high}
	</span>
);
