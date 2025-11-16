import moment from "moment-timezone";

import { AirportAdvisory } from "~/lib/faa";
import { getLatestTimeValue } from "~/lib/utils";

export const AirportClosureProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => (
	// <pre className="max-w-[100px] text-blue-300">
	// 	{JSON.stringify(advisory, null, 2)}
	// </pre>
	<div className="flex flex-col space-y-2">
		<div className="flex flex-row justify-between">
			<div className="text-sm">NOTAM</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				#{advisory.airportClosure!.notamNumber}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Start</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{moment(advisory.airportClosure!.startTime).format('ddd, MMM Do [at] h:mm A')}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">End</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{moment(advisory.airportClosure!.endTime).format('ddd, MMM Do [at] h:mm A')}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Duration</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{getLatestTimeValue(moment(advisory.airportClosure!.endTime).diff(moment(advisory.airportClosure!.startTime)), ', ', false, 2)}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Advisory</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter max-w-[415px] text-right">
				{advisory.airportClosure!.text || advisory.airportClosure!.simpleText}
			</div>
		</div>
	</div>
)