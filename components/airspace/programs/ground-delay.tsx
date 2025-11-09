import { ExternalLink } from "lucide-react";
import { AirportAdvisory } from "~/lib/faa";
import { Badge } from "~/components/ui/badge";
import { getLatestTimeValue, getUrlDomain } from "~/lib/utils";

const CenterBadge: React.FC<{ center: string }> = ({ center }) => (
	<Badge variant="secondary" className="font-mono text-xs mr-0.5">
		{center.toUpperCase()}
	</Badge>
)

export const GroundDelayProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => (
	<div className="flex flex-col space-y-2">
		<div className="flex flex-row justify-between">
			<div className="text-sm">Average Delay</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{getLatestTimeValue(advisory.groundDelay!.avgDelay * 60 * 1000, ' ')}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Maximum Delay</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{getLatestTimeValue(advisory.groundDelay!.maxDelay * 60 * 1000, ' ')}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Last Update</div>
			<div className="text-sm tabular-nums font-mono tracking-tighter">
				{advisory.groundDelay!.updatedAt}
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Advisory URL</div>
			<div className="flex flex-row gap-2 items-center text-sm font-mono tracking-tighter text-blue-400">
				<a href={advisory.groundDelay!.advisoryUrl} target="_blank" rel="noopener noreferrer">
					{getUrlDomain(advisory.groundDelay!.advisoryUrl)}
				</a>
				<ExternalLink className="inline size-3" />
			</div>
		</div>
		<div className="flex flex-row justify-between">
			<div className="text-sm">Affected Centers</div>
			<div className="max-w-[210px]">
				{
					advisory
						.groundDelay!
						.includedFacilities
						.filter(facility => facility.startsWith('Z'))
						.sort((a, b) => a.localeCompare(b))
						.map(facility => (
							<CenterBadge
								key={facility}
								center={facility}
							/>
						))
				}
			</div>
		</div>
	</div>
)