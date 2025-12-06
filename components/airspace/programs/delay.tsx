import { useMemo } from "react";
import { AirportAdvisory, DelayAdvisory } from "~/lib/faa";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import { capitalizeFirst, cn, delayReason, getLatestTimeValue, parseDelayTime } from "~/lib/utils";

type DelayProgramMode = "both" | "arrivals" | "departures";
 
type ProgramDetailsProps = {
	delayProgram: DelayAdvisory;
};

const computeRange = (min: string, max: string) => {
	if (!min || !max) return '';

	const minHours = min.match(/(\d+)h/)?.[1] || '0';
	const minMinutes = min.match(/(\d+)m/)?.[1] || '0';
	const maxHours = max.match(/(\d+)h/)?.[1] || '0';
	const maxMinutes = max.match(/(\d+)m/)?.[1] || '0';

	const minTotal = parseInt(minHours) * 60 + parseInt(minMinutes);
	const maxTotal = parseInt(maxHours) * 60 + parseInt(maxMinutes);

	const range = Math.abs(maxTotal - minTotal);
	const hours = Math.floor(range / 60);
	const minutes = range % 60;

	if (hours && minutes) return `±${hours}h ${minutes}m`;
	if (hours) return `±${hours}h`;
	if (minutes) return `±${minutes}m`;

	return '';
}

const TrendIndicator: React.FC<{ trend: string }> = ({ trend }) => {
	if (!trend) return null;

	const TrendIcon = trend === 'Increasing'
		? ArrowUpRightIcon
		: trend === 'Decreasing'
			? ArrowDownRightIcon
			: null;
	
	const color = trend === 'Increasing'
		? 'text-red-500'
		: trend === 'Decreasing'
			? 'text-green-500'
			: null;
	
	return (
		<div className={cn("flex flex-row gap-1 items-center", color)}>
			{TrendIcon && <TrendIcon className="h-4 w-4" />}
			{capitalizeFirst(trend)}
		</div>
	);
}

const ProgramDetails: React.FC<ProgramDetailsProps> = ({ delayProgram }) => {
	const minDelay = parseDelayTime(delayProgram.arrivalDeparture.min);
	const maxDelay = parseDelayTime(delayProgram.arrivalDeparture.max);
	
	return (
		<>
			<div className="flex flex-row justify-between">
				<div className="text-sm">Reason</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{delayReason(delayProgram.reason)}
				</div>
			</div>
			<div className="flex flex-row justify-between">
				<div className="text-sm">Average Delay</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					{getLatestTimeValue(parseInt(delayProgram.averageDelay) * 60 * 1000, ' ')}
				</div>
			</div>
			<div className="border-l border-muted-foreground/60 border-dashed pl-2">
				<div className="flex flex-row justify-between">
					<div className="text-sm">Minimum</div>
					<div className="text-sm tabular-nums font-mono tracking-tighter">
						{minDelay}
					</div>
				</div>
				<div className="flex flex-row justify-between">
					<div className="text-sm">Maximum</div>
					<div className="text-sm tabular-nums font-mono tracking-tighter">
						{maxDelay}
					</div>
				</div>
				<div className="flex flex-row justify-between">
					<div className="text-sm">Range</div>
					<div className="text-sm tabular-nums font-mono tracking-tighter">
						{computeRange(minDelay, maxDelay)}
					</div>
				</div>
			</div>
			<div className="flex flex-row justify-between">
				<div className="text-sm">Trend</div>
				<div className="text-sm tabular-nums font-mono tracking-tighter">
					<TrendIndicator trend={delayProgram.arrivalDeparture.trend} />
				</div>
			</div>
		</>
	);
};

export const DelayProgram: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => {
	const mode: DelayProgramMode = useMemo(() => 
		(advisory.arrivalDelay && advisory.departureDelay)
			? "both"
			: advisory.arrivalDelay
				? "arrivals"
				: "departures",
		[advisory]
	);
	
	return (
		<div className="flex flex-col space-y-2 max-h-full">
			{mode === "arrivals" && (
				<ProgramDetails delayProgram={advisory.arrivalDelay!} />
			)}
			
			{mode === "departures" && (
				<ProgramDetails delayProgram={advisory.departureDelay!} />
			)}
			
			{mode === "both" && (
				<div className="grid grid-cols-2 gap-8">
					<div>
						<span className="text-sm font-bold">Arrivals</span>
						<div className="flex flex-col space-y-1.5">
							<ProgramDetails delayProgram={advisory.arrivalDelay!} />
						</div>
					</div>
					<div>
						<span className="text-sm font-bold">Departures</span>
						<div className="flex flex-col space-y-1.5">
							<ProgramDetails delayProgram={advisory.departureDelay!} />
						</div>
					</div>
				</div>
			)}
		</div>
	)
}