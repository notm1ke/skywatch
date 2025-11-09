import { AirportAdvisory } from "~/lib/faa";

export const DeicingProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => (
	<div className="flex flex-col space-y-2">
		<div className="flex flex-row justify-between">
			<div className="text-sm">Event Time</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{advisory.deicing!.eventTime}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Expire Time</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{advisory.deicing!.expTime}
			</div>
		</div>
	</div>
)