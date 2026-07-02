import { cn } from "cnfast";
import { ExternalLink } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { AirportAdvisory } from "~/lib/schemas";
import { capitalizeFirst, getUrlDomain } from "~/lib/utils";

const CenterBadge: React.FC<{ center: string }> = ({ center }) => (
	<Badge variant="secondary" className="font-mono text-xs mr-0.5">
		{center.toUpperCase()}
	</Badge>
)

const ExtensionIndicator: React.FC<{ extensionProbability: string }> = ({ extensionProbability }) => {
	if (!extensionProbability) return null;
	const iconAmount = extensionProbability === 'HIGH'
		? 3
		: extensionProbability === 'MEDIUM'
			? 2
			: 1;
	
	const color = extensionProbability === 'HIGH'
		? 'text-red-500'
		: extensionProbability === 'MEDIUM'
			? 'text-yellow-500'
			: 'text-green-500';
	
	return (
		<div className={cn("flex flex-row gap-1.5 items-center", color)}>
			<div className="flex flex-row gap-0">
				{iconAmount > 0 && (
					<span className={cn(color, "font-sans font-semibold tracking-wide")}>
						{"|".repeat(iconAmount)}
					</span>
				)}
				
				{iconAmount !== 3 && (
					<span className="font-sans font-semibold text-secondary-foreground/40 tracking-wide">
						{"|".repeat(3 - iconAmount)}
					</span>
				)}
			</div>
			{capitalizeFirst(extensionProbability.toLowerCase())}
		</div>
	);
}

export const GroundStopProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => {
	const affectedCenters = advisory
		.groundStop!
		.includedFacilities
		?.filter(facility => facility.startsWith('Z')) ?? [];
	
	return (
		<div className="flex flex-col space-y-2">
			<div className="flex flex-row justify-between">
				<div className="text-sm">Reason</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{capitalizeFirst(advisory.groundStop!.impactingCondition)}
				</div>
			</div>

			<div className="flex flex-row justify-between">
				<div className="text-sm">Expiration Time</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{advisory.groundStop!.programExpirationTime}
				</div>
			</div>

			<div className="flex flex-row justify-between">
				<div className="text-sm">Extension Probability</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					<ExtensionIndicator extensionProbability={advisory.groundStop!.probabilityOfExtension} />
				</div>
			</div>
			
			<div className="flex flex-row justify-between">
				<div className="text-sm">Advisory URL</div>
				<div className="flex flex-row gap-2 items-center text-sm font-mono tracking-tighter text-blue-400">
					<a href={advisory.groundStop!.advisoryUrl} target="_blank" rel="noopener noreferrer">
						{getUrlDomain(advisory.groundStop!.advisoryUrl)}
					</a>
					<ExternalLink className="inline size-3" />
				</div>
			</div>
			
			{affectedCenters.length && (
				<div className="flex flex-row justify-between">
					<div className="text-sm">Affected Centers</div>
					<div className="max-w-[210px]">
						{
							affectedCenters
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
			)}
		</div>
	);
} 