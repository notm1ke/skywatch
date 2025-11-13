import { unrollDatum } from ".";
import { TrafficFlow } from "~/lib/traffic";
import { cn, formatFaaTime, shortNumberFormatter } from "~/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export const ArrivalCapacityChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => (
	<ChartContainer config={chart.config} className={cn("min-h-[200px] h-[200px] w-full")}>
		<ResponsiveContainer width="100%" height={200}>
			<LineChart data={unrollDatum(chart.data)} accessibilityLayer>
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
