import { AtisBroadcast } from "./atis";
import { TsaWaitTimes } from "../tsa-wait";
import { RunwayConditions } from "./runways";
import { MeteorologicalReport } from "../metar";
import { AirportWithJoins } from "~/lib/airports";

export const InspectorOperationsTab: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	return (
		<>
			<div className="basis-full sm:basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-2 divide-x-2 divide-y-2">
					<AtisBroadcast airport={airport} />
					<RunwayConditions airport={airport} />
				</div>
			</div>
			<div className="sm:basis-1/3 border-l">
				<MeteorologicalReport airport={airport} />
				<TsaWaitTimes airport={airport} />
			</div>
		</>
	)
}