import { cn } from "~/lib/utils";
import { flowCenterColors } from "~/lib/utils";
import { InterruptionTimeline } from "./timeline";
import { FlightsGlance } from "./flights-glance";
import { ChevronDown, CircleSmall } from "lucide-react";
import { InterruptionsGlance } from "./interruptions-glance";
import { AirspaceLocalizations, Airspaces } from "@/schemas";
import { AirspaceOrAny, useAirspaceInteractivity } from "./store";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "../ui/dropdown-menu";

const localize = (airspace: AirspaceOrAny) => {
	switch (airspace) {
		case "any": return "All airspaces";
		default: return `${airspace.toUpperCase()} (${AirspaceLocalizations[airspace]})`;
	}
}

export const AirspaceFilterRow = () => {
	const { active, setActive } = useAirspaceInteractivity();
	return (
		<div className="flex flex-row h-full text-sm divide-x">
			<div className="flex items-center justify-center relative w-56 h-full overflow-hidden">
				<DropdownMenu>
					<DropdownMenuTrigger className="min-w-0">
						<div className="flex flex-row items-center gap-1.5 pl-1 min-w-0 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-250 rounded-md">
							<span className="flex flex-row items-center gap-1 min-w-0 text-md font-semibold">
								<CircleSmall
									className={cn(
										"shrink-0 size-4",
										active === "any"
											? "fill-accent"
											: "text-transparent"
									)}
									style={active === "any" ? undefined : { fill: flowCenterColors(active) }}
								/>
								<span className="truncate">{localize(active)}</span>
							</span>
							<ChevronDown className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => setActive('any')}>
							<CircleSmall className="fill-accent" />
							All airspaces
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{Airspaces.map(airspace => (
							<DropdownMenuItem
								key={`airspace-filter-${airspace}`}
								onClick={() => setActive(airspace)}
							>
								<CircleSmall
									className="text-transparent"
									style={{ fill: flowCenterColors(airspace) }}
								/>
								{localize(airspace)}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<FlightsGlance />
			<InterruptionsGlance />
			<InterruptionTimeline />
		</div>
	)
}