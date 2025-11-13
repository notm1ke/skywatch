import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { TrafficByCenterChart } from "./by-center";
import { TrafficByStatusChart } from "./by-status";
import { useEffect, useMemo, useState } from "react";
import { TrafficByAircraftChart } from "./by-aircraft";
import { ArrivalCapacityChart } from "./arrival-capacity";
import { ArgumentType, cn, formatFaaTime, shortNumberFormatter } from "~/lib/utils";
import { DataPoint, fetchAggregatedTrafficFlow, TrafficFlow } from "~/lib/traffic";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";

import {
	ChevronDown,
	CircleDotDashed,
	Plane,
	PlaneLanding,
	TicketsPlane,
	TowerControl
} from "lucide-react";

type CallerType = ArgumentType<typeof fetchAggregatedTrafficFlow>[0];

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
		case "arrival_capacity": return "Arrival Capacity";
	}
}

type TotalBadgeProps = {
	mode: CallerType;
	response: TrafficFlow;
}

const TotalBadge: React.FC<TotalBadgeProps> = ({ mode, response }) => {
	if (mode === "traffic_by_status" || mode === "traffic_by_center") {
		const last = response.data.at(-1);
		if (!last) return "Unknown";

		const total = last.cumulative;
		return shortNumberFormatter.format(total);
	}
	
	if (mode === "traffic_by_aircraft") {
		const dataset = response.data.at(0);
		if (!dataset || response.data.length !== 1) return "Unknown";
		return shortNumberFormatter.format(dataset.cumulative);
	}

	return '0';
}

const LegendDisabled: Array<CallerType> = [
	"traffic_by_aircraft"
];

export const TrafficFlowChart = () => {
	const [mode, setMode] = useState<CallerType>('traffic_by_status');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [chart, setChart] = useState<TrafficFlow | null>(null);

	const refresh = () => {
		setLoading(true);
		fetchAggregatedTrafficFlow(mode)
			.then(res => unwrap<TrafficFlow<string>>(res)) // expand bc typescript has issues inferring
			.then(setChart)
			.catch(err => {
				setError(err.message);
				toast("Error loading traffic info:", {
					description: err.message,
					action: {
						label: "Retry",
						onClick: refresh
					}
				});
			})
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		refresh();
	}, [mode]);

	const title = localizeCallerType(mode);
	const fullScreen = LegendDisabled.includes(mode);
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

	if (loading) return <>loading</>
	if (error || !chart) return <>error</>;

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
						<DropdownMenuItem onClick={() => handleSetMode('traffic_by_center')}>
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
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					<TotalBadge mode={mode} response={chart} />
				</div>
			</div>

			<div className={cn(!fullScreen && "p-2 mt-2")}>
				{mode === 'traffic_by_status' && <TrafficByStatusChart chart={chart} />}
				{mode === 'traffic_by_center' && <TrafficByCenterChart chart={chart} />}
				{mode === "traffic_by_aircraft" && <TrafficByAircraftChart chart={chart} />}
				{mode === 'arrival_capacity' && <ArrivalCapacityChart chart={chart} />}

				{!LegendDisabled.includes(mode) && (
					<div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500 mt-1 pl-2">
						<span>{start}</span>
						<span>{end}</span>
					</div>
				)}
			</div>
		</div>
	)
}
