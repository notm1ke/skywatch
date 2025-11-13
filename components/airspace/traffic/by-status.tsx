import { unrollDatum } from ".";
import { FlowStatusMetricKeys, TrafficFlow } from "~/lib/traffic";
import { cn, flowStatusColors, formatFaaTime, shortNumberFormatter } from "~/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export const TrafficByStatusChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<LineChart data={unrollDatum(chart.data)} accessibilityLayer>
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
