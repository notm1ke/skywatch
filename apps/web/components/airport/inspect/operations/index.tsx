import { AtisBroadcast } from "./atis";
import { TsaWaitTimes } from "./tsa-wait";
import { RunwayConditions } from "./runways";
import { MeteorologicalReport } from "./metar";
import { AirportAdvisories } from "./advisories";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { HistoricalStatus } from "./historical";

export const InspectorOperationsTab: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	return (
		<>
			<div className="basis-full sm:basis-2/3">
				<div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-y">
					<AtisBroadcast airport={airport} />
					<RunwayConditions airport={airport} />
					<HistoricalStatus airport={airport} />
					<AirportAdvisories airport={airport} />
				</div>
			</div>
			<div className="sm:basis-1/3">
				<MeteorologicalReport airport={airport} />
				<TsaWaitTimes airport={airport} />
			</div>
		</>
	)
}