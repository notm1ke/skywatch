import { orpc } from "~/lib/gateway";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrafficByCenterChart } from "./by-center";
import { TrafficByStatusChart } from "./by-status";
import { TrafficByAirlineChart } from "./by-airline";
import { TrafficByAircraftChart } from "./by-aircraft";
import { TrafficChartSkeleton } from "./skeletons/chart";
import { ErrorSection } from "~/components/error-section";
import { ArrivalCapacityChart } from "./arrival-capacity";
import { TrafficTreemapSkeleton } from "./skeletons/treemap";
import { DataPoint, TrafficFlow } from "@skywatch/gateway/schemas";
import { cn, formatFaaTime, shortNumberFormatter } from "~/lib/utils";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";

import {
	AlertTriangle,
	ChevronDown,
	CircleDotDashed,
	Plane,
	PlaneLanding,
	TicketsPlane,
	TowerControl
} from "lucide-react";

type CallerType = 
	| "traffic_by_status"
	| "traffic_by_center"
	| "traffic_by_aircraft"
	| "traffic_by_airline"
	| "arrival_capacity";

type UnrolledData<T extends string = string> = {
	time: string;
	cumulative: number;
} & Record<T, number>;

export const unrollDatum = <T extends string>(data: DataPoint<T>[]): UnrolledData<T>[] => 
	data.map(point => ({
		time: point.time,
		cumulative: point.cumulative,
		...point.datum
	}))

const localizeCallerType = (mode: CallerType) => {
	switch (mode) {
		case "traffic_by_status": return "Traffic by Status";
		case "traffic_by_center": return "Traffic by Center";
		case "traffic_by_aircraft": return "Traffic by Aircraft";
		case "traffic_by_airline": return "Traffic by Airline";
		case "arrival_capacity": return "Arrival Capacity";
	}
}

const rpc = (mode: CallerType) => {
	switch (mode) {
		case "traffic_by_status": return orpc.traffic.statuses;
		case "traffic_by_center": return orpc.traffic.centers;
		case "traffic_by_aircraft": return orpc.traffic.aircraft;
		case "traffic_by_airline": return orpc.traffic.airline;
		case "arrival_capacity": return orpc.traffic.arrivalCapacity;
	}
}

type TotalBadgeProps = {
	mode: CallerType;
	response: TrafficFlow | undefined;
}

const TotalBadge: React.FC<TotalBadgeProps> = ({ mode, response }) => {
	if (!response) return <AlertTriangle className="size-4" />;
	
	if (mode === "traffic_by_status" || mode === "traffic_by_center") {
		const last = response.data.at(-1);
		if (!last) return "Unknown";

		const total = last.cumulative;
		return shortNumberFormatter.format(total);
	}
	
	if (mode === "traffic_by_aircraft" || mode === "traffic_by_airline") {
		const dataset = response.data.at(0);
		if (!dataset || response.data.length !== 1) return "Unknown";
		return shortNumberFormatter.format(dataset.cumulative);
	}

	return '0';
}

const LegendDisabled: Array<CallerType> = [
	"traffic_by_aircraft",
	"traffic_by_airline",
];

export const TrafficFlowChart = () => {
	const [mode, setMode] = useState<CallerType>('traffic_by_status');
	// @ts-ignore phantom error when building - this is safe
	const { data: chart, isLoading, error, refetch } = useQuery(rpc(mode).queryOptions());
	
	const errored = error || !chart;
	const title = localizeCallerType(mode);
	const fullScreen = LegendDisabled.includes(mode) || errored;
	const [start, end] = useMemo(
		() => {
			const fallback = ['Start', 'End'];
			if (!chart?.data) return fallback;
			const [first, last] = [
				chart.data.at(0),
				chart.data.at(-1)
			];

			if (!first || !last) return fallback;
			return [first.time, last.time].map(formatFaaTime);
		},
		[chart]
	);

	const handleSetMode = (newMode: CallerType) => {
		if (mode === newMode) return;
		setMode(newMode);
	}

	if (isLoading) switch (mode) {
		case "traffic_by_aircraft":
		case "traffic_by_airline":
			return <TrafficTreemapSkeleton />
		case "arrival_capacity":
		case "traffic_by_center":
		case "traffic_by_status":
		default: 
			return <TrafficChartSkeleton />
	}

	return (
		<div className="divide-y-2">
			<div className="flex flex-row pr-3 py-2 justify-between border-b">
				<DropdownMenu>
					<DropdownMenuTrigger className="ml-2">
						<div className="flex flex-row items-center gap-1 pl-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-250 rounded-md">
							<span className="text-md font-semibold">
								{title}
							</span>
							<ChevronDown className="size-5 text-zinc-400 dark:text-zinc-500" />
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => handleSetMode('traffic_by_status')}>
							<CircleDotDashed />
							Traffic by Status
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleSetMode('traffic_by_center')}>
							<TowerControl />
							Traffic by Center
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleSetMode('traffic_by_airline')}>
							<TicketsPlane />
							Traffic by Airline
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleSetMode('traffic_by_aircraft')}>
							<Plane />
							Traffic by Aircraft
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleSetMode('arrival_capacity')}>
							<PlaneLanding />
							Arrival Capacity
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div
					className={cn(
						"flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none",
						errored && "bg-yellow-300 dark:bg-yellow-600 animate-pulse"
					)}
				>
					<TotalBadge
						mode={mode}
						response={chart}
					/>
				</div>
			</div>

			<div className={cn(!fullScreen && "p-2 mt-2")}>
				{errored && (
					<ErrorSection
						title="Error loading air traffic"
						error={error?.message}
						refresh={refetch}
					/>
				)}
				
				{!errored && mode === 'traffic_by_status' && <TrafficByStatusChart chart={chart} />}
				{!errored && mode === 'traffic_by_center' && <TrafficByCenterChart chart={chart} />}
				{!errored && mode === "traffic_by_aircraft" && <TrafficByAircraftChart chart={chart} />}
				{!errored && mode === "traffic_by_airline" && <TrafficByAirlineChart chart={chart} />}
				{!errored && mode === 'arrival_capacity' && <ArrivalCapacityChart chart={chart} />}

				{(!LegendDisabled.includes(mode) && !errored) && (
					<div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500 mt-1 pl-[34px] pr-1.5">
						<span>{start}</span>
						<span>{end}</span>
					</div>
				)}
			</div>
		</div>
	)
}
