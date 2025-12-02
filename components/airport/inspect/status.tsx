import { Check } from "lucide-react";
import { AirportAdvisory } from "~/lib/faa";
import { DelayProgram } from "./status/delay";
import { DeicingProgram } from "./status/deicing";
import { AirportWithJoins } from "~/lib/airports";
import { GroundStopProgram } from "./status/ground-stop";
import { ClosureProgram } from "./status/airport-closure";
import { GroundDelayProgram } from "./status/ground-delay";
import { SpecialAdvisoryProgram } from "./status/special-advisory";

const AllClear: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => (
	<div className="sticky top-0 z-10 border-y border-green-500/20 bg-green-500/10 px-4.5 py-3 backdrop-blur-sm">
		<div className="flex items-center gap-3">
			<span className="flex flex-row items-center gap-2 text-sm font-semibold text-green-400">
				<Check className="size-4" />
				Normal Operations
			</span>
		</div>
	</div>
)

const component = (advisory?: AirportAdvisory) => {
	if (!advisory) return AllClear;
	if (advisory.airportClosure) return ClosureProgram;
	if (advisory.groundStop) return GroundStopProgram;
	if (advisory.groundDelay) return GroundDelayProgram;
	if (advisory.arrivalDelay || advisory.departureDelay) return DelayProgram;
	if (advisory.deicing) return DeicingProgram;
	if (advisory.freeForm) return SpecialAdvisoryProgram;
	return AllClear;
}

export const StatusRibbon: React.FC<{ airport: AirportWithJoins, advisory?: AirportAdvisory }> = ({ airport, advisory }) => {
	const ribbon = { jsx: component(advisory) };
	
	return (
		<ribbon.jsx
			airport={airport}
			advisory={advisory!}
		/>
	);
}