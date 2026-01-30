"use client";

import { AirspaceMap } from "./airspace-map";
import { TrafficFlowChart } from "./traffic";
import { useMobile } from "../mobile-provider";
import { FlightStatuses } from "./flight-stats";
import { ActiveAdvisories } from "./advisories";
import { ActivePrograms } from "./active-programs";
import { AirspacePlannedEvents } from "./planned-programs";

export const AirspaceTab = () => {
	const { mobile, pending } = useMobile();
	if (pending) return <div className="min-h-screen bg-muted-foreground/10 animate-pulse" />;
	if (mobile) return (
		<div className="flex flex-col">
			<div className="basis-full sm:basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-3">
					<div className="sm:col-span-3">
						<AirspaceMap />
					</div>
					<div className="sm:col-span-2 border-t border-r">
						<ActivePrograms />
						<AirspacePlannedEvents />
					</div>
				</div>
			</div>
			<div className="sm:basis-1/3 border-t border-l-0 sm:border-l sm:border-t-0">
				<TrafficFlowChart />
				<FlightStatuses />
			</div>
		</div>
	)
	
	return (
		<div className="flex flex-row">
			<div className="basis-full sm:basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-3">
					<div className="sm:col-span-3">
						<AirspaceMap />
					</div>
					<div className="sm:col-span-2 border-t border-r">
						<TrafficFlowChart />
					</div>
					<div className="border-t">
						<FlightStatuses />
					</div>
				</div>
			</div>
			<div className="sm:basis-1/3 border-t border-l-0 sm:border-l sm:border-t-0">
				<ActivePrograms />
				<AirspacePlannedEvents />
				<ActiveAdvisories />
			</div>
		</div>
	)
}