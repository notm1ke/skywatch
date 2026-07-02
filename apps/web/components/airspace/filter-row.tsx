import { flowCenterColors } from "~/lib/utils";
import { ChevronDown, CircleSmall } from "lucide-react";
import { AirspaceLocalizations, Airspaces } from "@/schemas";
import { AirspaceOrAny, useAirspaceInteractivity } from "./store";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";

const localize = (airspace: AirspaceOrAny) => {
	switch (airspace) {
		case "any": return "All airspaces";
		default: return `${airspace.toUpperCase()} - ${AirspaceLocalizations[airspace]}`;
	}
}

export const AirspaceFilterRow = () => {
	const { active, setActive } = useAirspaceInteractivity();
	return (
		<div className="flex flex-row h-full text-sm divide-x">
			<div className="flex items-center relative w-72 h-full">
				<DropdownMenu>
					<DropdownMenuTrigger className="ml-2">
						<div className="flex flex-row items-center gap-1 pl-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-250 rounded-md">
							<span className="text-md font-semibold">
								{localize(active)}
							</span>
							<ChevronDown className="size-5 text-zinc-400 dark:text-zinc-500" />
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
			
			{/* search */}
		</div>
	)
}