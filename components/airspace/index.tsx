import { AirspaceMap } from "./airspace-map";
import { ActivePrograms } from "./active-programs";
import { AirspacePlannedEvents } from "./planned-programs";

export const AirspaceTab = () => {
	return (
		<div className="flex flex-row">
			<div className="basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<AirspaceMap />
					</div>
				</div>
			</div>
			<div className="basis-1/3">
				<ActivePrograms />
				<AirspacePlannedEvents />
			</div>
		</div>
	)
}