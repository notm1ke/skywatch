import moment from "moment-timezone";

import { AirportAdvisory } from "~/lib/faa";
import { getLatestTimeValue } from "~/lib/utils";

export const SpecialAdvisoryProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => (
	<div className="flex flex-col space-y-2">
		<div className="flex flex-row justify-between">
			<div className="text-sm">NOTAM</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				#{advisory.freeForm!.notamNumber}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Start</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{moment(advisory.freeForm!.startTime).format('ddd, MMM Do [at] h:mm A')}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">End</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{moment(advisory.freeForm!.endTime).format('ddd, MMM Do [at] h:mm A')}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Duration</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{getLatestTimeValue(moment(advisory.freeForm!.endTime).diff(moment(advisory.freeForm!.startTime)), ', ', false, 2)}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Advisory</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter max-w-[415px] text-right">
				{advisory.freeForm!.text}
			</div>
		</div>
	</div>
)