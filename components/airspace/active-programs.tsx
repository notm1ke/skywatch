import { useAirspace } from "./provider"
import { AirportAdvisory } from "~/lib/faa";
import { ChevronRight } from "lucide-react";
import { shortenAirportName } from "~/lib/utils";
import { useAirports } from "../airport-provider";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { GroundDelayProgram } from "./programs/ground-delay";
import { SpecialAdvisoryProgram } from "./programs/special-advisory";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "../ui/disclosure";

const computePriority = (advisory: AirportAdvisory) => {
	if (advisory.airportClosure) return 5;
	if (advisory.groundStop) return 4;
	if (advisory.groundDelay) return 3;
	if (advisory.arrivalDelay || advisory.departureDelay) return 2;
	if (advisory.freeForm) return 1;
	return 0;
}

const sortOrder = (a: AirportAdvisory, b: AirportAdvisory) =>
	computePriority(b) - computePriority(a);

const programIndicator = (advisory: AirportAdvisory) => {
	const priority = computePriority(advisory);
	switch (priority) {
		case 5: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-red-400 animate-pulse" />
				Airport Closure
			</div>
		)
		case 4: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-orange-400 rounded-[30%]" />
				Ground Stop
			</div>
		)
		case 3: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-yellow-400 rounded-[30%]" />
				Ground Delay
			</div>
		)
		case 2: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-yellow-400 rounded-[30%]" />
				{advisory.arrivalDelay ? "Arrival" : "Departure"} Delay
			</div>
		)
		case 1: return (
			<div className="flex gap-2 items-center text-sm">
				<div className="size-3 bg-blue-400 rounded-[30%]" />
				Special Advisory
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
		case 5:
		case 4:
			return <></>
		case 3:
			return <GroundDelayProgram advisory={advisory} />
		case 2:
		case 1:
			return <SpecialAdvisoryProgram advisory={advisory} />
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
		<div className="border-l">
			<div className="flex flex-row p-3 justify-between">
				<span className="text-md font-bold">
					Active Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-800 font-mono tabular-nums">
					{advisories.length}
				</div>
			</div>
			<div className="border-t">
				{advisories.sort(sortOrder).map(advisory => {
					const airport = airports.find(airport => airport.iata_code === advisory.airportId);
					if (!airport) return null;
					
					return (
						<Disclosure key={advisory.airportId} className="border-b">
							<DisclosureTrigger>
								<div className="group flex flex-row justify-between px-3 pb-3 aria-expanded:pb-0 pt-3">
									<div>
										<div className="flex items-center">
											<ChevronRight className="size-4 mr-2 text-zinc-500 transition-transform duration-200 ease-in-out rotate-0 group-aria-expanded:rotate-90" />
											<span className="text-sm font-bold font-mono px-2 bg-zinc-700 mr-2">{airport.iata_code}</span>
											<span className="text-sm font-bold">{shortenAirportName(airport.name)}</span>
										</div>
									</div>
									<div className="flex items-center">{programIndicator(advisory)}</div>
								</div>
							</DisclosureTrigger>
							<DisclosureContent>
								<div className="mt-3 border-t border-spacing-x-5 border-dashed" />
								<ScrollArea className="max-h-[250px] p-3">
									{programDisclosureContent(advisory)}
									<ScrollBar orientation="vertical" />
								</ScrollArea>
							</DisclosureContent>
						</Disclosure>
					);
				})}
			</div>
		</div>
	)
}