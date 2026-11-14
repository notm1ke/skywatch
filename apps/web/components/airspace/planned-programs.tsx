import Link from "next/link";

import { cn } from "cnfast";
import { motion } from "motion/react";
import { useAirspace } from "./provider";
import { Hint } from "../ui/hint";
import { useAirports } from "../airport-provider";
import { ScrollArea } from "../ui/scroll-area";
import { ErrorSection } from "../error-section";
import { PlannedAirportEvent } from "~/lib/schemas";
import { useEffect, useState } from "react";
import { Skeleton, SkeletonWithDelay } from "../ui/skeleton";
import { classifyPlan, relativeTime, type PlanKind } from "./planned-event";

import {
	Ban,
	CircleDashed,
	ClockCheck,
	CloudLightning,
	Construction,
	Hand,
	Hourglass,
	LucideIcon,
	Users
} from "lucide-react";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

const KIND: Record<PlanKind, { icon: LucideIcon; stripe: string; icon_color: string; explain?: string }> = {
	stop: {
		icon: Hand,
		stripe: "bg-orange-400",
		icon_color: "text-orange-400",
		explain: "A ground stop holds flights at their origin airport until the FAA releases them."
	},
	delay: {
		icon: Hourglass,
		stripe: "bg-yellow-400",
		icon_color: "text-yellow-500",
		explain: "A ground delay program spreads arrivals out by assigning departure times at the origin airports."
	},
	closure: { icon: Ban, stripe: "bg-red-400", icon_color: "text-red-400" },
	weather: { icon: CloudLightning, stripe: "bg-blue-400", icon_color: "text-blue-400" },
	facility: { icon: Construction, stripe: "bg-violet-400", icon_color: "text-violet-400" },
	traffic: { icon: Users, stripe: "bg-zinc-400 dark:bg-zinc-500", icon_color: "text-muted-foreground" },
	other: { icon: CircleDashed, stripe: "bg-zinc-300 dark:bg-zinc-600", icon_color: "text-muted-foreground" }
};

// rows are a fixed height so the list can be sized in whole rows: four show at a time, never one cut in half
const ROW_HEIGHT = "h-12";
const LIST_HEIGHT = "h-48";

const localTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** the airports on a line: a link where it's one we track, plain otherwise (facilities, or airports we don't have) */
const AirportChip: React.FC<{ code: string; tracked: boolean }> = ({ code, tracked }) => {
	const chip = "text-xs font-bold font-mono px-1.5 bg-zinc-300 dark:bg-zinc-700";
	if (!tracked) return <span className={chip}>{code}</span>;

	return (
		<Link prefetch href={`/airports/${code}`} className={cn(chip, "transition-colors hover:bg-zinc-400/70 dark:hover:bg-zinc-600")}>
			{code}
		</Link>
	);
};

const PlanRow: React.FC<{ plan: PlannedAirportEvent; index: number; now: number; trackedCodes: Set<string> }> = ({ plan, index, now, trackedCodes }) => {
	// An airport with nothing after it still has to say something. The raw line is only for when we couldn't read
	// anything at all: it has the time and the feed's decoration in it.
	const description = plan.eventType || (plan.iataCode ? "Planned interruption" : plan.raw);
	const { kind, hedged } = classifyPlan(`${plan.eventType} ${plan.raw}`);
	const { icon: Icon, stripe, icon_color, explain } = KIND[kind];

	const at = plan.at ? new Date(plan.at).getTime() : null;
	const wording = plan.forecastType === "after" ? "After" : plan.forecastType === "until" ? "Until" : "";

	// one line: the full text is in the tooltip (or the title) when it doesn't fit
	const text = (
		<span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" title={description}>
			<Icon className={cn("size-3.5 shrink-0", icon_color)} />
			<span className="truncate">{description}</span>
		</span>
	);

	return (
		<motion.div
			className={cn("flex items-center gap-3 px-3", ROW_HEIGHT)}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: index * (40 / 1000) }}
		>
			{/* faded when the line only says something is possible: nothing has been issued yet */}
			<div className={cn("h-6 w-0.5 shrink-0 rounded-full", stripe, hedged && "opacity-40")} />

			<div className="flex min-w-0 flex-1 items-center gap-2">
				{/* a slot as wide as a 3-letter code, so the descriptions line up down the list */}
				<div className="min-w-9 shrink-0">
					{plan.iataCode && <AirportChip code={plan.iataCode} tracked={trackedCodes.has(plan.iataCode)} />}
				</div>

				{explain || hedged
					? (
						<Hint
							title={description}
							body={explain ?? "The FAA is watching this and has not issued anything yet."}
							note={hedged && explain ? "“Possible” means the FAA is watching it: nothing has been issued yet." : undefined}
							side="left"
						>
							<button type="button" className="flex min-w-0 cursor-help text-left">{text}</button>
						</Hint>
					)
					: text}
			</div>

			{(at || plan.time) && (
				<div className="shrink-0 text-right leading-tight">
					{at ? (
						<>
							<Hint
								title="In effect"
								body={`${wording || "At"} ${localTime(plan.at!)} your time, ${plan.time} Zulu. The FAA posts these in UTC.`}
								side="left"
							>
								<div className="cursor-help font-mono text-sm tabular-nums">
									{wording && <span className="text-muted-foreground">{wording} </span>}
									{localTime(plan.at!)}
								</div>
							</Hint>
							<div className="text-[11px] text-muted-foreground">{relativeTime(at, now, plan.forecastType)}</div>
						</>
					) : (
						// a time we couldn't turn into an instant: show it as it was written
						<div className="font-mono text-sm text-muted-foreground">{wording} {plan.time}</div>
					)}
				</div>
			)}
		</motion.div>
	);
};

export const AirspacePlannedEvents = () => {
	const { airports } = useAirports();
	const { planned, loading, error, refresh } = useAirspace();

	// for "ends in 20m": refreshed every 30 seconds
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(timer);
	}, []);

	const trackedCodes = new Set(airports.map(airport => airport.iata_code));

	if (loading) return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono pointer-events-none">
					<Skeleton className="h-[25px] w-10 rounded-sm" />
				</div>
			</div>
			<div className="border-t">
				<ScrollArea className={LIST_HEIGHT}>
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={`planned-programs-skeleton-${i}`} className={cn("flex flex-row items-center justify-between gap-3 px-3", ROW_HEIGHT)}>
							<div className="flex items-center gap-2">
								<SkeletonWithDelay className="h-4 w-10 rounded" delay={i * 50} />
								<SkeletonWithDelay className="h-4 w-44 rounded" delay={i * 50} />
							</div>
							<div className="space-y-1">
								<SkeletonWithDelay className="ml-auto h-4 w-20 rounded" delay={i * 50} />
								<SkeletonWithDelay className="ml-auto h-3 w-16 rounded" delay={i * 50} />
							</div>
						</div>
					))}
				</ScrollArea>
			</div>
		</div>
	);

	if (error) return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono pointer-events-none">
					<Skeleton className="h-[25px] w-10 rounded-sm" />
				</div>
			</div>

			<ErrorSection
				title="Error loading planned interruptions"
				error={error?.message}
				refresh={refresh}
				className="border-t rounded-none border-solid"
			/>
		</div>
	);

	return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{planned.length}
				</div>
			</div>
			<div className="border-t">
				{!planned.length && (
					<Empty className={LIST_HEIGHT}>
						<EmptyHeader>
							<EmptyMedia>
								<div className="bg-green-200 dark:bg-green-700 p-2 rounded-lg">
									<ClockCheck />
								</div>
							</EmptyMedia>
							<EmptyTitle>No planned interruptions</EmptyTitle>
							<EmptyDescription>
								The FAA has not posted any upcoming planned interruption advisories.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}

				{planned.length > 0 && (
					<ScrollArea className={LIST_HEIGHT}>
						<div className="divide-y">
							{planned.map((plan, i) => (
								<PlanRow
									key={`planned-${plan.iataCode}-${plan.raw}-${i}`}
									plan={plan}
									index={i}
									now={now}
									trackedCodes={trackedCodes}
								/>
							))}
						</div>
					</ScrollArea>
				)}
			</div>
		</div>
	)
}
