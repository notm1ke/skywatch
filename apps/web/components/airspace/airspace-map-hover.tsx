import { Snowflake } from "lucide-react";
import { PropsWithChildren } from "react";
import { AirportAdvisory } from "~/lib/schemas";
import { useAirspaceInteractivity } from "./store";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { AdvisoryType, advisoryPriority } from "./active-programs";
import { formatAirportLocation, shortenAirportName } from "~/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import Link from "next/link";

const indicator = (advisory: AirportAdvisory, priority: AdvisoryType) => {
	switch (priority) {
		case AdvisoryType.AirportClosure: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-red-400 animate-pulse rounded-[30%]" />
				Airport Closure
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
				Normal
			</div>
		)
	}
}

export const AirspaceMapHoverCard: React.FC<PropsWithChildren<{ advisory: AirportAdvisory, airport: AirportWithJoins }>> = ({ advisory, airport, children }) => {
	const { hover, hovered } = useAirspaceInteractivity();
	const priority = advisoryPriority(advisory);
	
	return (
			<HoverCard
				openDelay={50}
				onOpenChange={open => {
					if (!open) hover(null);
					if (advisory.airportId === hovered?.airportId) return;
					else hover(advisory);
				}}
			>
				<HoverCardTrigger>{children}</HoverCardTrigger>
				<HoverCardContent className="w-64">
					<Link
						href={`/airports/${airport.iata_code}`}
						onClick={() => hover(null)}
					>
						<div className="flex flex-row items-start gap-4">
							<div>
								<span className="text-zinc-800 dark:text-zinc-400 font-mono font-bold text-sm">
									{airport.iata_code}
								</span>
							</div>
		
							<div className="space-y-1">
								<h4 className="text-sm font-semibold">{shortenAirportName(airport.name)}</h4>
								<p className="text-sm">{formatAirportLocation(airport)}</p>
								<div className="text-muted-foreground text-xs">
									{indicator(advisory, priority)}
								</div>
							</div>
						</div>
					</Link>
				</HoverCardContent>
			</HoverCard>
	);
} 