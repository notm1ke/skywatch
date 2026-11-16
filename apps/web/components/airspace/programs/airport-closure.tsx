import moment from "moment-timezone";

import { AirportAdvisory } from "~/lib/schemas";
import { getLatestTimeValue } from "~/lib/utils";

/**
 * The details of a closure, for a full one and a limited one alike. The NOTAM is shown as the FAA wrote it, in one row like
 * the other programs' rows: its number is the label and the whole line is the value on the right, which is what to check
 * anything else on this page against. A limited closure also gets its qualifier on a row of its own (the part after
 * "closed" that says when, or to whom), since that's the bit that makes it limited.
 */
export const AirportClosureProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => {
	const closure = advisory.airportClosure!;
	const qualifier = closure.text.trim();

	return (
		<div className="flex flex-col space-y-2">
			{/* the notice itself, as written: its number is the label, the text is on the right */}
			<div className="flex flex-row justify-between gap-4">
				<div className="text-sm shrink-0">NOTAM #{closure.notamNumber}</div>
				<div className="max-w-[260px] text-right text-sm font-mono tracking-tighter wrap-anywhere">
					{closure.simpleText}
				</div>
			</div>

			{qualifier && (
				<div className="flex flex-row justify-between gap-4">
					<div className="text-sm shrink-0">Limits</div>
					<div className="max-w-[260px] text-right text-sm font-mono tracking-tighter wrap-anywhere uppercase">
						{qualifier}
					</div>
				</div>
			)}

			<div className="flex flex-row justify-between">
				<div className="text-sm">Start</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{moment(closure.startTime).format('ddd, MMM Do [at] h:mm A')}
				</div>
			</div>
			<div className="flex flex-row justify-between">
				<div className="text-sm">End</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{moment(closure.endTime).format('ddd, MMM Do [at] h:mm A')}
				</div>
			</div>
			<div className="flex flex-row justify-between">
				<div className="text-sm">Duration</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{getLatestTimeValue(moment(closure.endTime).diff(moment(closure.startTime)), ', ', false, 2)}
				</div>
			</div>
		</div>
	);
}
