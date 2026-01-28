import { unrollDatum } from ".";
import { FlowStatusMetricKeys, TrafficFlow } from "@skywatch/gateway/schemas";
import { cn, flowStatusColors, formatFaaTime, shortNumberFormatter } from "~/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";

export const TrafficByStatusChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<AreaChart data={unrollDatum(chart.data)} accessibilityLayer>
				<XAxis dataKey="time" hide />
				<YAxis
					width={30}
					axisLine={false}
					tickLine={false}
					tickFormatter={tick => shortNumberFormatter.format(tick)}
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

				{/*{chart.dataKeys.map(item => (
					<Line
						key={item}
						dataKey={item}
						type="monotone"
						stroke={flowStatusColors(item as FlowStatusMetricKeys)}
						strokeWidth={1.75}
						dot={false}
					/>
				))}*/}
				
				{chart.dataKeys.map(item => (
					<Area
						key={item}
						dataKey={item}
						type="monotone"
						fill={flowStatusColors(item as FlowStatusMetricKeys)}
						fillOpacity={0.4}
						stroke={flowStatusColors(item as FlowStatusMetricKeys)}
						strokeWidth={1.75}
						dot={false}
					/>
				))}
			</AreaChart>
		</ResponsiveContainer>
	</ChartContainer>
);
