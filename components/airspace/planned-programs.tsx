import { useAirspace } from "./provider";
import { ClockCheck } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { useAirports } from "../airport-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";

export const AirspacePlannedEvents = () => {
	const { airports } = useAirports();
	const { planned, loading, error } = useAirspace();
	
	if (loading) return <>loading</>;
	if (error) return <>error</>;
	
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
					<ScrollArea className="py-2 max-h-[340px]">
						{planned.map(plan => {
							const airport = airports.find(airport => airport.iata_code === plan.iataCode);
							if (!airport) return null;
							
							return (
								<div key={`planned-${plan.iataCode}`} className="group flex flex-row justify-between px-3 py-1.5">
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