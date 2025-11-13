import { PropsWithChildren } from "react";
import { DelayProgram } from "./programs/delay";
import { DeicingProgram } from "./programs/deicing";
import { AirportAdvisory, AirportStatus } from "~/lib/faa";
import { GroundStopProgram } from "./programs/ground-stop";
import { GroundDelayProgram } from "./programs/ground-delay";
import { SpecialAdvisoryProgram } from "./programs/special-advisory";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

const hoverCardContent = (advisory: AirportAdvisory, status: AirportStatus) => {
	switch (status) {
		case 'airport_closure':
			return <></>
		case 'ground_stop':
			return <GroundStopProgram advisory={advisory} />
		case 'ground_delay':
			return <GroundDelayProgram advisory={advisory} />
		case 'ops_delay':
			return <DelayProgram advisory={advisory} />
		case 'freeform':
			return <SpecialAdvisoryProgram advisory={advisory} />
		case 'deicing':
			return <DeicingProgram advisory={advisory} />
		default:
			return <></>
	}
}

export const AirspaceMapHoverCard: React.FC<PropsWithChildren<{ advisory: AirportAdvisory, status: AirportStatus }>> = ({ advisory, status, children }) => (
	<HoverCard>
		<HoverCardTrigger>{children}</HoverCardTrigger>
		<HoverCardContent className="min-w-[400px] max-w-lg">
			<div className="flex flex-col divide-y-2 space-y-2">
				<div className="flex flex-row space-x-2 pb-2 items-center">
					<span className="bg-zinc-300 dark:bg-zinc-700 px-2 font-mono font-bold">
						{advisory.airportId}
					</span>
					<span className="font-semibold">
						{advisory.airportLongName}
					</span>
				</div>
				<div className="flex w-full">
					{hoverCardContent(advisory, status)}
				</div>
			</div>
		</HoverCardContent>
	</HoverCard>
)