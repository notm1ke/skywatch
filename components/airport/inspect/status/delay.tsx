import { AirportAdvisory } from "~/lib/faa";
import { Button } from "~/components/ui/button";
import { AirportWithJoins } from "~/lib/airports";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";

import {
	capitalizeFirst,
	cn,
	delayReason,
	getLatestTimeValue,
	parseDelayTime,
	shortenAirportName
} from "~/lib/utils";

import {
	Item,
	ItemContent,
	ItemDescription,
	ItemHeader,
	ItemTitle
} from "~/components/ui/item";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "~/components/ui/dialog";

import {
	ArrowDownRightIcon,
	ArrowRight,
	ArrowUpRightIcon,
	ClockAlert,
	ClockArrowDown,
	ClockArrowUp,
	ClockFading,
	Info,
	LucideIcon,
	PlaneLanding,
	PlaneTakeoff
} from "lucide-react";

type DelayType = "both" | "arrival" | "departure";

const delayTitle = (mode: DelayType): { title: string, dialogTitle: string, Icon: LucideIcon } => {
	switch (mode) {
		case "both": return {
			title: "Delay",
			dialogTitle: "delays",
			Icon: ClockAlert
		};
		case "arrival": return {
			title: "Arrival Delay",
			dialogTitle: "arrival delays",
			Icon: PlaneLanding
		};
		case "departure": return {
			title: "Departure Delay",
			dialogTitle: "departure delays",
			Icon: PlaneTakeoff
		};
	}
}

const RibbonInfo: React.FC<{ advisory: AirportAdvisory, mode: DelayType }> = ({ advisory, mode }) => {
	if (mode === "arrival") return (
		<span>
			Avg {getLatestTimeValue(parseInt(advisory.arrivalDelay!.averageDelay) * 60 * 1000, ' ')}{" / "}
			Max {parseDelayTime(advisory.arrivalDelay!.arrivalDeparture.max)}
		</span>
	);
	if (mode === "departure") return (
		<span>
			Avg {getLatestTimeValue(parseInt(advisory.departureDelay!.averageDelay) * 60 * 1000, ' ')}{" / "}
			Max {parseDelayTime(advisory.departureDelay!.arrivalDeparture.max)}
		</span>
	);
	
	return <></>;
}

const TrendIndicator: React.FC<{ trend: string }> = ({ trend }) => {
	if (!trend) return null;

	const TrendIcon = trend === 'Increasing'
		? ArrowUpRightIcon
		: trend === 'Decreasing'
			? ArrowDownRightIcon
			: ArrowRight;
	
	const color = trend === 'Increasing'
		? 'bg-red-500'
		: trend === 'Decreasing'
			? 'bg-green-500'
			: 'bg-orange-500';
	
	const text = trend ?? "Unknown";
	
	return (
		<Item variant="outline">
			<ItemHeader>
				<Avatar>
					<AvatarFallback className={cn(color)}>
						<TrendIcon className="size-5 text-white" />
					</AvatarFallback>
				</Avatar>
			</ItemHeader>
			<ItemContent>
				<ItemTitle>Trend</ItemTitle>
				<ItemDescription className="text-xs">
					{text}
				</ItemDescription>
			</ItemContent>
		</Item>
	);
}

const SingleModeInfo: React.FC<{ advisory: AirportAdvisory }> = ({ advisory }) => (
	<div className="flex flex-col space-y-4">
		<div className="flex flex-col space-y-1">
			<span className="text-sm">The reason for this delay is:</span>
			<pre className="font-mono text-xs text-muted-foreground wrap-break-word">
				{delayReason(advisory.departureDelay!.reason)}
			</pre>
		</div>
		
		<div className="grid grid-cols-2 gap-2 w-full">
			<Item variant="outline">
				<ItemHeader>
					<Avatar>
						<AvatarFallback className="bg-green-600">
							<ClockArrowDown className="size-4.5 text-white" />
						</AvatarFallback>
					</Avatar>
				</ItemHeader>
				<ItemContent>
					<ItemTitle>Minimum</ItemTitle>
					<ItemDescription className="text-xs">
						{parseDelayTime(advisory.departureDelay!.arrivalDeparture.min)}
					</ItemDescription>
				</ItemContent>
			</Item>
			
			<Item variant="outline">
				<ItemHeader>
					<Avatar>
						<AvatarFallback className="bg-red-500">
							<ClockArrowUp className="size-4.5 text-white" />
						</AvatarFallback>
					</Avatar>
				</ItemHeader>
				<ItemContent>
					<ItemTitle>Maximum</ItemTitle>
					<ItemDescription className="text-xs">
						{parseDelayTime(advisory.departureDelay!.arrivalDeparture.max)}
					</ItemDescription>
				</ItemContent>
			</Item>
			
			<Item variant="outline">
				<ItemHeader>
					<Avatar>
						<AvatarFallback className="bg-amber-500">
							<ClockFading className="size-4.5 text-white" />
						</AvatarFallback>
					</Avatar>
				</ItemHeader>
				<ItemContent>
					<ItemTitle>Average</ItemTitle>
					<ItemDescription className="text-xs">
						{getLatestTimeValue(parseInt(advisory.departureDelay!.averageDelay) * 60 * 1000, ' ')}
					</ItemDescription>
				</ItemContent>
			</Item>
			
			<TrendIndicator trend={advisory.departureDelay!.arrivalDeparture.trend} />
		</div>
	</div>
);

export const DelayProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => {
	const mode: DelayType = (advisory.arrivalDelay && advisory.departureDelay)
		? "both"
		: advisory.arrivalDelay
			? "arrival"
			: "departure";
	
	const { title, dialogTitle, Icon } = delayTitle(mode);
	
	return (
		<div className="sticky top-0 z-10 border-y border-orange-500/20 bg-orange-500/10 px-4.5 py-3 backdrop-blur-sm decoration-orange-600">
			<div className="flex items-center gap-3 justify-between">
				<div className="flex flex-row space-x-3">
					<span className="flex flex-row items-center gap-2 text-sm font-semibold text-orange-400">
						<Icon className="size-4" />
						{title}
					</span>
					
					{mode !== "both" && (
						<span className="text-sm text-orange-400/70">
							{capitalizeFirst(
								delayReason(
									mode === "arrival"
										? advisory!.arrivalDelay!.reason
										: advisory!.departureDelay!.reason
								).toLowerCase()
							)}
						</span>
					)}
				</div>
				<div className="flex font-mono text-sm text-orange-400 items-center gap-3 h-4">
					<RibbonInfo
						advisory={advisory}
						mode={mode}
					/>
					
					<Dialog>
						<DialogTrigger className="flex flex-row space-x-1 text-sm items-center">
							<Button variant="ghost" size="icon-sm">
								<Info />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{shortenAirportName(airport.name)} has {dialogTitle} 
								</DialogTitle>
								<DialogDescription>
									{/*This closure will be in effect until{" "}
									{moment.utc(advisory.airportClosure!.endTime).format('ddd, MMM Do YYYY [at] h:mm A')}.*/}
								</DialogDescription>
							</DialogHeader>
							
							<Separator />
							
							{mode !== "both" && <SingleModeInfo advisory={advisory} />}
							{mode === "both" && <>{/* todo */}</>}
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</div>
	);
} 