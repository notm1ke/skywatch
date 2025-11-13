import { AirspaceType, TrafficFlow } from "~/lib/traffic";
import { cn, flowCenterColors, formatFaaTime, shortNumberFormatter } from "~/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { unrollDatum } from ".";

export const TrafficByCenterChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<BarChart data={unrollDatum(chart.data)} accessibilityLayer>
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
