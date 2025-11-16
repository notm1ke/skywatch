import { AirspaceMap } from "./airspace-map";
import { TrafficFlowChart } from "./traffic";
import { ActivePrograms } from "./active-programs";
import { AirspacePlannedEvents } from "./planned-programs";
import { CancellationsPieChart } from "./cancellations";

export const AirspaceTab = () => {
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
			<div className="sm:basis-1/3 border-l">
				<ActivePrograms />
				<AirspacePlannedEvents />
			</div>
		</div>
	)
}