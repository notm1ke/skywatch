"use client";

import { useEffect } from "react";
import { AirspaceMap } from "./airspace-map";
import { TrafficFlowChart } from "./traffic";
import { useMobile } from "../mobile-provider";
import { FlightStatuses } from "./flight-stats";
import { ActiveAdvisories } from "./advisories";
import { ActivePrograms } from "./active-programs";
import { AirspacePlannedEvents } from "./planned-programs";
import { AirspaceFilterRow } from "./filter-row";
import { useAirspaceInteractivity } from "./store";

export const AirspaceTab = () => {
	const { setActive } = useAirspaceInteractivity();
	const { mobile, pending } = useMobile();

	useEffect(() => {
		return () => setActive("any");
	}, []);
	if (pending) return <div className="min-h-[80vh] bg-muted-foreground/10 animate-pulse" />;
	if (mobile) return (
		<div className="flex flex-col">
			<div className="basis-full sm:basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-3">
					<AirspaceMap />
					<div className="border-t border-r">
						<ActivePrograms />
						<AirspacePlannedEvents />
						<ActiveAdvisories />
					</div>
				</div>
			</div>
			<div className="divide-y border-l-0 sm:border-l sm:border-t-0">
				<FlightStatuses />
				<TrafficFlowChart />
			</div>
		</div>
	)
	
	return (
		<div className="flex flex-col divide-y">
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
			<div className="flex-row justify-between h-10 items-center divide-x">
				<AirspaceFilterRow />
			</div>
		</div>
	)
}