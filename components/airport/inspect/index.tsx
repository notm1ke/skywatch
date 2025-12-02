"use client";

import { AirportMap } from "./map";
import { StatusRibbon } from "./status";
import { AirportAdvisory } from "~/lib/faa";
import { RunwayConditions } from "./runways";
import { AirportWithJoins } from "~/lib/airports";
import { Skeleton } from "~/components/ui/skeleton";
import { useAirports } from "~/components/airport-provider";
import { useAirspace } from "~/components/airspace/provider";

const useScopedAdvisories = (iata: string): [AirportAdvisory | undefined, boolean] => {
	const { advisories, loading } = useAirspace();
	if (loading) return [undefined, true];
	
	const airport = advisories.find(advisory => advisory.airportId === iata);
	return [airport, false];
}

const AdvisoryRibbon: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const [advisories, loading] = useScopedAdvisories(airport.iata_code!); 
	
	if (loading) return (
		<div className="sticky top-0 z-10 border-y border-muted/20 bg-muted/10 px-4.5 py-4 backdrop-blur-sm">
			<div className="flex items-center gap-3 justify-between">
				<div className="flex flex-row space-x-3">
					<Skeleton className="size-4 rounded-full" />
					<Skeleton className="h-4 w-32" />
				</div>
				<div>
					<Skeleton className="h-4 w-48" />
				</div>
			</div>
		</div>
	);
	
	return (
		<StatusRibbon
			airport={airport}
			advisory={advisories}
		/>
	);
}

export const AirportInspector: React.FC<{ iata: string }> = ({ iata }) => {
	const { airports, loading } = useAirports();
	if (loading) return <>loading</>;
	
	const airport = airports.find(airport => airport.iata_code?.toLowerCase() === iata.toLowerCase());
	if (!airport) return <>not found</>;
	
	return (
		<div className="h-screen overflow-hidden">
			<AirportMap airport={airport} />
			<AdvisoryRibbon airport={airport} />
			
			<div className="flex flex-col sm:flex-row">
				<div className="basis-full sm:basis-2/3">
					<div>
						
					</div>
					{/*<div className="grid grid-cols-1 sm:grid-cols-3">
						<div className="sm:col-span-3">
							<AirspaceMap />
						</div>
						<div className="sm:col-span-2 border-t border-r">
							<TrafficFlowChart />
						</div>
						<div className="border-t">
							<CancellationsPieChart />
						</div>
					</div>*/}
				</div>
				<div className="sm:basis-1/3 border-l">
					<RunwayConditions airport={airport} />
				</div>
			</div>
		</div>
	)
}