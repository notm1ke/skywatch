import { useAirspace } from "./provider";
import { ScrollArea } from "../ui/scroll-area";
import { useAirports } from "../airport-provider";

export const AirspacePlannedEvents = () => {
	const { airports } = useAirports();
	const { planned, loading, error } = useAirspace();
	
	if (loading) return <>loading</>;
	if (error) return <>error</>;
	
	return (
		<div className="border-l border-b">
			<div className="flex flex-row p-3 justify-between">
				<span className="text-md font-bold">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-800 font-mono tabular-nums">
					{planned.length}
				</div>
			</div>
			<div className="border-t">
				<ScrollArea className="py-2 max-h-[340px]">
					{planned.map(plan => {
						const airport = airports.find(airport => airport.iata_code === plan.iataCode);
						if (!airport) return null;
						
						return (
							<div key={plan.iataCode} className="group flex flex-row justify-between px-3 py-1.5">
								<div>
									<div className="flex items-center gap-1">
										<span className="text-zinc-500 font-mono tracking-tighter text-sm">{plan.time}</span>
										<span className="text-sm font-mono px-2">at {airport.iata_code}</span>
										{/*<span className="text-sm font-bold">{shortenAirportName(airport.name)}</span>*/}
									</div>
								</div>
								<div className="text-sm">{plan.eventType}</div>
							</div>
						);
					})}
				</ScrollArea>
			</div>
		</div>
	)
}