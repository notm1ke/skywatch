import Link from "next/link";

import { cn } from "cnfast";
import { Snowflake } from "lucide-react";
import { PropsWithChildren } from "react";
import { AirportAdvisory } from "~/lib/schemas";
import { useAirspaceInteractivity } from "./store";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { AdvisoryType, advisoryPriority } from "./active-programs";
import { formatAirportLocation, shortenAirportName } from "~/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

/** the stripe down the card's edge, in the same color as the pin */
const statusStripe = (priority: AdvisoryType) => {
	switch (priority) {
		case AdvisoryType.AirportClosure: return "bg-red-400";
		// the same red, paler: it's a closure that doesn't shut the airport
		case AdvisoryType.LimitedClosure: return "bg-red-300 dark:bg-red-400/50";
		case AdvisoryType.GroundStop: return "bg-orange-400";
		case AdvisoryType.GroundDelay:
		case AdvisoryType.DualDelay:
		case AdvisoryType.ArrivalDelay:
		case AdvisoryType.DepartureDelay: return "bg-yellow-400";
		case AdvisoryType.FreeForm:
		case AdvisoryType.Deicing: return "bg-blue-400";
		default: return "bg-green-400";
	}
}

const indicator = (advisory: AirportAdvisory | undefined, priority: AdvisoryType) => {
	switch (priority) {
		case AdvisoryType.AirportClosure: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-red-400 animate-pulse rounded-[30%]" />
				Airport Closure
			</div>
		)
		case AdvisoryType.LimitedClosure: return (
			<div className="grid gap-1">
				<div className="flex gap-2 items-center text-sm">
					<div className="size-3 border-2 border-red-400 rounded-[30%]" />
					Limited Closure
				</div>
				{/* what the NOTAM says, as it says it: we label it limited, we don't try to translate it */}
				<div className="font-mono text-[11px] leading-snug break-words uppercase">{advisory?.airportClosure?.text}</div>
			</div>
		)
		case AdvisoryType.GroundStop: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-orange-400 rounded-[30%]" />
				Ground Stop
			</div>
		)
		case AdvisoryType.GroundDelay: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-yellow-400 rounded-[30%]" />
				Ground Delay
			</div>
		)
		case AdvisoryType.DualDelay:
		case AdvisoryType.ArrivalDelay:
		case AdvisoryType.DepartureDelay: {
			if (!advisory) return null; // should never hit
			const type = (advisory.arrivalDelay && advisory.departureDelay)
				? "Arr + Dept"
				: advisory.arrivalDelay
					? "Arrival"
					: "Departure";

			return (
				<div className="flex gap-2 items-center text-sm">
					<div className="size-3 bg-yellow-400 rounded-[30%]" />
					{type} Delay
				</div>
			)
		}
		case AdvisoryType.FreeForm: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-blue-400 rounded-[30%]" />
				Special Advisory
			</div>
		)
		case AdvisoryType.Deicing: return (
			<div className="flex gap-2 items-center text-sm">
				<Snowflake className="size-4 text-blue-400" />
				Deicing
			</div>
		)
		default: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-green-400 rounded-[30%]" />
				Normal Operations
			</div>
		)
	}
}

/**
 * The read-out itself: a stripe in the status color, the airport's code and name, where it is, and what's happening.
 * It goes inside a `HoverCard`, and is shared by the airspace map and the statistics page's map.
 */
export const AirportStatusCard: React.FC<{ advisory?: AirportAdvisory, airport: AirportWithJoins }> = ({ advisory, airport }) => {
	const priority = advisoryPriority(advisory);

	return (
		<HoverCardContent
			side="top"
			sideOffset={10}
			className="pointer-events-none w-auto max-w-72 overflow-hidden p-0"
		>
			<div className="flex items-stretch">
				<div className={cn("w-1 shrink-0", statusStripe(priority))} />
				<div className="grid gap-0.5 px-3 py-2">
					<div className="flex items-baseline gap-2">
						<span className="text-zinc-800 dark:text-zinc-400 font-mono font-bold text-sm">
							{airport.iata_code}
						</span>
						<h4 className="text-sm font-semibold">{shortenAirportName(airport.name)}</h4>
					</div>
					<p className="text-xs text-muted-foreground">{formatAirportLocation(airport)}</p>
					<div className="mt-1 text-muted-foreground text-xs">
						{indicator(advisory, priority)}
					</div>
				</div>
			</div>
		</HoverCardContent>
	);
}

/**
 * The pin is the link (click it to open the airport) and the card is just a read-out: it can't be moved onto, so it
 * closes the moment the pointer leaves the pin instead of lingering over its neighbors.
 *
 * Hovering also lights up the matching row in Active Interruptions, immediately rather than when the card closes.
 */
export const AirspaceMapHoverCard: React.FC<PropsWithChildren<{ advisory?: AirportAdvisory, airport: AirportWithJoins }>> = ({ advisory, airport, children }) => {
	const hover = useAirspaceInteractivity(state => state.hover);

	return (
		<HoverCard openDelay={40} closeDelay={0}>
			<HoverCardTrigger asChild>
				<Link
					href={`/airports/${airport.iata_code}`}
					className="block"
					onPointerEnter={() => advisory && hover(advisory, "map")}
					onPointerLeave={() => advisory && hover(null)}
					onClick={() => hover(null)}
				>
					{children}
				</Link>
			</HoverCardTrigger>
			<AirportStatusCard advisory={advisory} airport={airport} />
		</HoverCard>
	);
}
