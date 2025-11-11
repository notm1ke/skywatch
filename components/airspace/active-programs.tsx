import { useAirspace } from "./provider"
import { AirportAdvisory } from "~/lib/faa";
import { DelayProgram } from "./programs/delay";
import { shortenAirportName } from "~/lib/utils";
import { useAirports } from "../airport-provider";
import { DeicingProgram } from "./programs/deicing";
import { ChevronRight, Snowflake } from "lucide-react";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { GroundStopProgram } from "./programs/ground-stop";
import { GroundDelayProgram } from "./programs/ground-delay";
import { SpecialAdvisoryProgram } from "./programs/special-advisory";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "../ui/disclosure";

enum Priority {
	Normal,
	Deicing,
	FreeForm,
	DepartureDelay,
	ArrivalDelay,
	DualDelay,
	GroundDelay,
	GroundStop,
	AirportClosure,
}

const computePriority = (advisory: AirportAdvisory) => {
	if (advisory.airportClosure) return Priority.AirportClosure;
	if (advisory.groundStop) return Priority.GroundStop;
	if (advisory.groundDelay) return Priority.GroundDelay;
	if (advisory.arrivalDelay && advisory.departureDelay) return Priority.DualDelay;
	if (advisory.arrivalDelay) return Priority.ArrivalDelay;
	if (advisory.departureDelay) return Priority.DepartureDelay;
	if (advisory.freeForm) return Priority.FreeForm;
	if (advisory.deicing) return Priority.Deicing;
	return Priority.Normal;
}

const sortOrder = (a: AirportAdvisory, b: AirportAdvisory) =>
	computePriority(b) - computePriority(a);

const programIndicator = (advisory: AirportAdvisory) => {
	const priority = computePriority(advisory);
	switch (priority) {
		case Priority.AirportClosure: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-red-400 animate-pulse" />
				Airport Closure
			</div>
		)
		case Priority.GroundStop: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-orange-400 rounded-[30%]" />
				Ground Stop
			</div>
		)
		case Priority.GroundDelay: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-yellow-400 rounded-[30%]" />
				Ground Delay
			</div>
		)
		case Priority.DualDelay:
		case Priority.ArrivalDelay:
		case Priority.DepartureDelay: {
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
		case Priority.FreeForm: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-blue-400 rounded-[30%]" />
				Special Advisory
			</div>
		)
		case Priority.Deicing: return (
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

const programDisclosureContent = (advisory: AirportAdvisory) => {
	const priority = computePriority(advisory);
	switch (priority) {
		case Priority.AirportClosure:
			return <></>
		case Priority.GroundStop:
			return <GroundStopProgram advisory={advisory} />
		case Priority.GroundDelay:
			return <GroundDelayProgram advisory={advisory} />
		case Priority.ArrivalDelay:
		case Priority.DepartureDelay:
		case Priority.DualDelay:
			return <DelayProgram advisory={advisory} />
		case Priority.FreeForm:
			return <SpecialAdvisoryProgram advisory={advisory} />
		case Priority.Deicing:
			return <DeicingProgram advisory={advisory} />
		default:
			return <></>
	}
}

export const ActivePrograms = () => {
	const { airports } = useAirports();
	const { advisories, loading, error } = useAirspace();
	
	if (loading) return (
		<>loading</>
	);
	
	if (error) return (
		<>error</>
	);
	
	return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Active Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{advisories.length}
				</div>
			</div>
			<div className="border-t">
				<ScrollArea className="min-h-auto h-[559px] max-h-[800px]">
					{advisories.sort(sortOrder).map(advisory => {
						const airport = airports.find(airport => airport.iata_code === advisory.airportId);
						if (!airport) return null;
						
						return (
							<Disclosure key={advisory.airportId} className="border-b">
								<DisclosureTrigger>
									<div className="group flex flex-row justify-between px-3 pb-3 pt-3 cursor-pointer hover:bg-muted/30 transition-colors duration-150 ease-out">
										<div>
											<div className="flex items-center">
												<ChevronRight className="size-4 mr-2 text-zinc-500 transition-transform duration-200 ease-in-out rotate-0 group-aria-expanded:rotate-90" />
												<span className="text-sm font-bold font-mono px-2 bg-zinc-300 dark:bg-zinc-700 mr-2">{airport.iata_code}</span>
												<span className="text-sm font-bold">{shortenAirportName(airport.name)}</span>
											</div>
										</div>
										<div className="flex items-center">{programIndicator(advisory)}</div>
									</div>
								</DisclosureTrigger>
								<DisclosureContent>
									<div className="border-t border-spacing-x-5 border-dashed" />
									<div className="p-3">
										{programDisclosureContent(advisory)}
										<ScrollBar orientation="vertical" />
									</div>
								</DisclosureContent>
							</Disclosure>
						);
					})}
				</ScrollArea>
			</div>
		</div>
	)
}