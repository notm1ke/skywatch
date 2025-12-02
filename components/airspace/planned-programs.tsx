import { useAirspace } from "./provider";
import { ClockCheck } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { ErrorSection } from "../error-section";
import { useAirports } from "../airport-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

export const AirspacePlannedEvents = () => {
	const { airports } = useAirports();
	const { planned, loading, error, refresh } = useAirspace();
	
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
				<div className="py-2 max-h-[340px] space-y-2">
					<div className="group flex flex-row justify-between px-3 py-1.5">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-20 rounded" />
							<Skeleton className="h-4 w-16 rounded" />
						</div>
						<Skeleton className="h-4 w-32 rounded" />
					</div>

					<div className="group flex flex-row justify-between px-3 py-1.5">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-20 rounded" />
							<Skeleton className="h-4 w-16 rounded" />
						</div>
						<Skeleton className="h-4 w-24 rounded" />
					</div>

					<div className="group flex flex-row justify-between px-3 py-1.5">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-20 rounded" />
							<Skeleton className="h-4 w-16 rounded" />
						</div>
						<Skeleton className="h-4 w-28 rounded" />
					</div>

					<div className="group flex flex-row justify-between px-3 py-1.5">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-20 rounded" />
							<Skeleton className="h-4 w-16 rounded" />
						</div>
						<Skeleton className="h-4 w-20 rounded" />
					</div>
				</div>
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
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<div className="bg-green-200 dark:bg-green-700 p-2 rounded-lg">
									<ClockCheck />
								</div>
							</EmptyMedia>
							<EmptyTitle>No planned interruptions</EmptyTitle>
							<EmptyDescription>
								The FAA has not posted any upcoming planned interruptions advisories.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				
				{planned.length > 0 && (
					<ScrollArea className="py-2 h-[252px]">
						{planned.map((plan, i) => {
							const airport = airports.find(airport => airport.iata_code === plan.iataCode);
							if (!airport) return null;
							
							return (
								<div key={`planned-${plan.iataCode}-${i}`} className="group flex flex-row justify-between px-3 py-1.5">
									<div>
										<div className="flex items-center gap-1">
											<Tooltip>
												<TooltipTrigger>
													<span className="text-zinc-500 font-mono tracking-tighter text-sm ligatures">
														{plan.forecastType === 'after' ? '>=' : '<='}
														{plan.time}
													</span>
												</TooltipTrigger>
												<TooltipContent side="left">
													<div className="text-center">
														Plan in effect {plan.forecastType}
														<br />
														<span className="font-semibold font-mono tracking-tighter">{plan.time}</span>
													</div>
												</TooltipContent>
											</Tooltip>
											<span className="text-sm font-mono px-2">at {airport.iata_code}</span>
											{/*<span className="text-sm font-bold">{shortenAirportName(airport.name)}</span>*/}
										</div>
									</div>
									<div className="text-sm">{plan.eventType}</div>
								</div>
							);
						})}
					</ScrollArea>
				)}
			</div>
		</div>
	)
}