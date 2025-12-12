"use client";

import { AirspaceMap } from "./airspace-map";
import { TrafficFlowChart } from "./traffic";
import { useMobile } from "../mobile-provider";
import { ActivePrograms } from "./active-programs";
import { CancellationsPieChart } from "./cancellations";
import { AirspacePlannedEvents } from "./planned-programs";

export const AirspaceTab = () => {
	const { mobile } = useMobile();
	if (mobile) return (
		<div className="flex flex-col sm:flex-row">
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
				<CancellationsPieChart />
			</div>
		</div>
	)
	
	return (
		<div className="flex flex-col sm:flex-row">
			<div className="basis-full sm:basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-3">
					<div className="sm:col-span-3">
						<AirspaceMap />
					</div>
					<div className="sm:col-span-2 border-t border-r">
						<TrafficFlowChart />
					</div>
					<div className="border-t">
						<CancellationsPieChart />
					</div>
				</div>
			</div>
			<div className="sm:basis-1/3 border-t border-l-0 sm:border-l sm:border-t-0">
				<ActivePrograms />
				<AirspacePlannedEvents />
			</div>
		</div>
	)
}