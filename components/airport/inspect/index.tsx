"use client";

import { StatusRibbon } from "./status";
import { TsaWaitTimes, TsaWaitTimesSkeletonLoader } from "./tsa-wait";
import { AirportAdvisory } from "~/lib/faa";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Plane } from "lucide-react";
import { AirportWithJoins } from "~/lib/airports";
import { Skeleton } from "~/components/ui/skeleton";
import { useAirports } from "~/components/airport-provider";
import { useAirspace } from "~/components/airspace/provider";
import { AirportMap, AirportMapSkeletonLoader } from "./map";
import { RunwayConditions, RunwaysSkeletonLoader } from "./runways";
import { MetarSkeletonLoader, MeteorologicalReport } from "./metar";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "~/components/ui/empty";

const useScopedAdvisories = (iata: string): [AirportAdvisory | undefined, boolean] => {
	const { advisories, loading } = useAirspace();
	if (loading) return [undefined, true];
	
	const airport = advisories.find(advisory => advisory.airportId === iata);
	return [airport, false];
}

export const AdvisoryRibbonSkeletonLoader = () => (
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
)

const AdvisoryRibbon: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const [advisories, loading] = useScopedAdvisories(airport.iata_code!); 
	
	if (loading) return <AdvisoryRibbonSkeletonLoader />;
	
	return (
		<StatusRibbon
			airport={airport}
			advisory={advisories}
		/>
	);
}

export const AirportInspector: React.FC<{ iata: string }> = ({ iata }) => {
	const { airports, loading } = useAirports();
	const { back } = useRouter();
	
	if (loading) return (
		<div className="h-screen overflow-hidden">
			<AirportMapSkeletonLoader />
			<AdvisoryRibbonSkeletonLoader />
			
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
					<MetarSkeletonLoader />
					<TsaWaitTimesSkeletonLoader />
					<RunwaysSkeletonLoader />
				</div>
			</div>
		</div>
	);
	
	const airport = airports.find(airport => airport.iata_code?.toLowerCase() === iata.toLowerCase());
	if (!airport) return (
		<div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-muted/5">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<div className="relative bg-red-200 dark:bg-red-700 px-2 py-2 rounded-lg">
							<Plane className="size-6 text-red-600 dark:text-red-300 rotate-45 -ml-0.5" />
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="w-8 h-0.5 bg-red-600 dark:bg-red-300 rotate-45" />
							</div>
						</div>
					</EmptyMedia>
					<EmptyTitle>Airport not found</EmptyTitle>
					<EmptyDescription>
						The airport you are looking for does not exist or is not currently available.
					</EmptyDescription>
					
					<EmptyContent>
						<Button
							size="sm"
							variant="link"
							className="text-muted-foreground group"
							onClick={back}
						>
							<span className="inline-block w-0 group-hover:w-5 mr-0 group-hover:mr-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
								<ArrowLeft />
							</span>
							<span>Go back</span>
						</Button>
					</EmptyContent>
				</EmptyHeader>
			</Empty>
		</div>
	);
	
	return (
		<div className="min-h-screen overflow-hidden">
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
					<MeteorologicalReport airport={airport} />
					<TsaWaitTimes airport={airport} />
					<RunwayConditions airport={airport} />
				</div>
			</div>
		</div>
	)
}