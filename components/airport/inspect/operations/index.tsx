import { AtisBroadcast } from "./atis";
import { RunwayConditions } from "./runways";
import { AirportWithJoins } from "~/lib/airports";

export const InspectorOperationsTab: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 divide-x-2 divide-y-2">
			<AtisBroadcast airport={airport} />
			<RunwayConditions airport={airport} />
		</div>
	)
}