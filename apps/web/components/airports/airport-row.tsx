"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "cnfast";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { AirportAdvisory } from "~/lib/schemas";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "~/components/ui/avatar";
import { AIRLINES, AirlineCode } from "./airlines";
import { formatAirportLocation } from "~/lib/utils";

type AdvisoryLevel = "ground-stop" | "delay" | null;

function getAdvisoryLevel(advisory: AirportAdvisory | undefined): AdvisoryLevel {
	if (!advisory) return null;
	if (advisory.groundStop || advisory.airportClosure) return "ground-stop";
	if (advisory.groundDelay || advisory.arrivalDelay || advisory.departureDelay) return "delay";
	return null;
}

const AIRLINE_ORDER = Object.keys(AIRLINES);

function hubAvatarSortOrder(a: { airline_iata: string }, b: { airline_iata: string }) {
	const ai = AIRLINE_ORDER.indexOf(a.airline_iata);
	const bi = AIRLINE_ORDER.indexOf(b.airline_iata);
	return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
}

function HubAvatars({ hubs }: { hubs: AirportWithJoins["airline_hubs"] }) {
	if (!hubs.length) return null;
	return (
		<AvatarGroup>
			{[...hubs].sort(hubAvatarSortOrder).map((hub: { airline_iata: string }) => {
				const code = hub.airline_iata as AirlineCode;
				const airline = AIRLINES[code];
				return (
					<Avatar key={hub.airline_iata} size="xs">
						{airline && (
							<AvatarImage
								src={airline.logo}
								alt={airline.name}
								className="object-contain"
							/>
						)}
						<AvatarFallback>{hub.airline_iata}</AvatarFallback>
					</Avatar>
				);
			})}
		</AvatarGroup>
	);
}

export const AirportRow = ({
	airport,
	advisory,
}: {
	airport: AirportWithJoins;
	advisory?: AirportAdvisory;
}) => {
	const level = getAdvisoryLevel(advisory);

	return (
		<Link
			href={`/airports/${airport.iata_code}`}
			prefetch
			className={cn(
				"flex items-center gap-3 px-4 py-2.5 text-sm border-b hover:bg-accent/30 transition-colors",
				level === "ground-stop" && "border-l-2 border-l-red-500",
				level === "delay" && "border-l-2 border-l-amber-500",
			)}
		>
			<span className="w-7 shrink-0 font-mono font-semibold tabular-nums">
				{airport.iata_code}
			</span>

			<span className="flex-1 truncate">
				{airport.name}
			</span>

			<span className="shrink-0 text-xs text-muted-foreground">
				{formatAirportLocation(airport)}
			</span>

			<div className="shrink-0">
				<HubAvatars hubs={airport.airline_hubs} />
			</div>

			<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
		</Link>
	);
};
