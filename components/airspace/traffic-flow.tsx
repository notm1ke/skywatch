import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { useEffect, useMemo, useState } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { ChevronDown, CircleDotDashed, Plane, PlaneLanding, TicketsPlane, TowerControl } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AggregationChartResponse, AirspaceType, fetchAggregatedTrafficFlow, FlowStatusMetricKeys } from "~/lib/faa";
import { ArgumentType, cn, flowCenterColors, flowStatusColors, formatFaaTime, shortNumberFormatter } from "~/lib/utils";

type CallerType = ArgumentType<typeof fetchAggregatedTrafficFlow>[0];

const localizeCallerType = (mode: CallerType) => {
	switch (mode) {
		case "traffic_by_status": return "Traffic by Status";
		case "traffic_by_center": return "Traffic by Center";
		case "arrival_capacity": return "Arrival Capacity"
	}
}

type TotalBadgeProps = {
	mode: CallerType;
	response: AggregationChartResponse;
}

const TotalBadge: React.FC<TotalBadgeProps> = ({ mode, response }) => {
	if (mode === 'traffic_by_status' || mode === 'traffic_by_center') {
		const last = response.data.at(-1);
		if (!last) return 'Unknown';
		
		const total = last.cumulative;
		return shortNumberFormatter.format(total);
	}
	
	return '0';
}

const TrafficByStatusChart: React.FC<{ chart: AggregationChartResponse }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<LineChart data={chart.data} accessibilityLayer>
				<XAxis dataKey="time" hide />
				<YAxis
					width={30}
					axisLine={false}
					tickLine={false}
					tickFormatter={tick => shortNumberFormatter.format(tick)}
				/>
				
				<CartesianGrid strokeDasharray="3 3" />
				
				<ChartTooltip
					content={
						<ChartTooltipContent
							className="w-[155px]"
							indicator="line"
							labelFormatter={formatFaaTime}
						/>}
				/>
				
				{chart.dataKeys.map(item => (
					<Line
						key={item}
						dataKey={item}
						type="monotone"
						stroke={flowStatusColors(item as FlowStatusMetricKeys)}
						strokeWidth={1.75}
						dot={false}
					/>
				))}
			</LineChart>
		</ResponsiveContainer>
	</ChartContainer>
);

const TrafficByCenterChart: React.FC<{ chart: AggregationChartResponse }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<BarChart data={chart.data} accessibilityLayer>
				<XAxis dataKey="time" hide />
				<YAxis
					width={30}
					axisLine={false}
					tickLine={false}
					tickFormatter={tick => shortNumberFormatter.format(tick)}
					domain={['dataMin', 'dataMax + 10']}
				/>
				
				<CartesianGrid
					vertical={false}
					strokeDasharray="3 3"
				/>
				
				<ChartTooltip
					content={
						<ChartTooltipContent
							className="w-[155px]"
							indicator="line"
							labelFormatter={formatFaaTime}
						/>}
				/>
				
				{chart.dataKeys.map(item => (
					<Bar
						key={item}
						dataKey={item}
						type="monotone"
						stackId="a"
						fill={flowCenterColors(item as AirspaceType)}
					/>
				))}
			</BarChart>
		</ResponsiveContainer>
	</ChartContainer>
);

const ArrivalCapacityChart: React.FC<{ chart: AggregationChartResponse }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<LineChart data={chart.data} accessibilityLayer>
				<XAxis dataKey="time" hide />
				<YAxis
					width={30}
					axisLine={false}
					tickLine={false}
					domain={['dataMin - 200', 'dataMax + 50']}
					tickFormatter={tick => shortNumberFormatter.format(tick)}
				/>
				
				<CartesianGrid strokeDasharray="3 3" />
				
				<ChartTooltip
					content={
						<ChartTooltipContent
							className="w-[155px]"
							indicator="line"
							labelFormatter={formatFaaTime}
						/>}
				/>
				
				{chart.dataKeys.map(item => (
					<Line
						key={item}
						dataKey={item}
						type="monotone"
						stroke="var(--color-green-400)"
						strokeWidth={1.75}
						dot={{ fill: "var(--color-green-400)" }}
					/>
				))}
			</LineChart>
		</ResponsiveContainer>
	</ChartContainer>
);

export const TrafficFlowChart = () => {
	const [mode, setMode] = useState<CallerType>('traffic_by_status');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [chart, setChart] = useState<AggregationChartResponse | null>(null);
	
	const refresh = () => {
		setLoading(true);
		fetchAggregatedTrafficFlow(mode)
			// @ts-expect-error mixed agg return types
			.then(unwrap)
			// @ts-expect-error expected
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
	if (error || !chart) return <>error</>
	
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
							Traffic by Air Operator
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleSetMode('traffic_by_center')}>
							<Plane />
							Traffic by Aircraft Type
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
			
			<div className="p-2 mt-2">
				{mode === 'traffic_by_status' && <TrafficByStatusChart chart={chart} />}
				{mode === 'traffic_by_center' && <TrafficByCenterChart chart={chart} />}
				{mode === 'arrival_capacity' && <ArrivalCapacityChart chart={chart} />}
				
				<div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500 mt-1 pl-2">
					<span>{start}</span>
					<span>{end}</span>
				</div>
			</div>
		</div>
	)
}