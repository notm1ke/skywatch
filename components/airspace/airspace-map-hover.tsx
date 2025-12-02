import { PropsWithChildren } from "react";
import { AirportAdvisory } from "~/lib/faa";
import { shortenAirportName } from "~/lib/utils";
import { programContent, programIndicator } from "./active-programs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

export const AirspaceMapHoverCard: React.FC<PropsWithChildren<{ advisory: AirportAdvisory }>> = ({ advisory, children }) => {
	return (
		<HoverCard>
			<HoverCardTrigger>{children}</HoverCardTrigger>
			<HoverCardContent className="w-full max-w-[525px]">
				<div className="flex flex-col divide-y-2 space-y-2">
					<div className="flex flex-row space-x-2 pb-2 items-start">
						<span className="bg-zinc-300 dark:bg-zinc-700 px-1.5 rounded-md font-mono font-bold">
							{advisory.airportId}
						</span>
						<span className="font-semibold">
							{shortenAirportName(advisory.airportLongName)}
						</span>
					</div>
					
					<div>
						<div className="pb-2 [&>div]:font-bold">
							{programIndicator(advisory)}
						</div>
						{programContent(advisory)}
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
} 