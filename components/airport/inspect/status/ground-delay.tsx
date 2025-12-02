import { ClockAlert } from "lucide-react";
import { AirportAdvisory } from "~/lib/faa";
import { AirportWithJoins } from "~/lib/airports";
import { capitalizeFirst, delayReason, getLatestTimeValue } from "~/lib/utils";

export const GroundDelayProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => (
	<div className="sticky top-0 z-10 border-y border-orange-500/20 bg-orange-500/10 px-4.5 py-3 backdrop-blur-sm">
		<div className="flex items-center gap-3 justify-between">
			<div className="flex flex-row space-x-3">
				<span className="flex flex-row items-center gap-2 text-sm font-semibold text-orange-400">
					<ClockAlert className="size-4" />
					Ground Delay
				</span>
				<span className="text-sm text-orange-400/70">
					{capitalizeFirst(delayReason(advisory!.groundDelay!.impactingCondition).toLowerCase())}
				</span>
			</div>
			<div className="flex font-mono text-sm text-orange-400 items-center gap-2">
				<span>
					Avg {getLatestTimeValue(advisory.groundDelay!.avgDelay * 60 * 1000, ' ')}{" / "}
					Max {getLatestTimeValue(advisory.groundDelay!.maxDelay * 60 * 1000, ' ')}
				</span>
			</div>
		</div>
	</div>
)