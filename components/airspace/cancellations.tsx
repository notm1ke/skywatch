import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { useEffect, useState } from "react";
import { Label, Pie, PieChart } from "recharts";
import { CancellationStats, fetchCancellationStats } from "~/lib/faa";

import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from "../ui/chart";

const chartConfig = {
	count: {
		label: "Count"
	},
	cancellations: {
		label: "Cancelled",
		color: "var(--color-red-400)"
	},
	normal: {
		label: "Normal",
		color: "var(--color-green-400)"
	}
} satisfies ChartConfig;

export const CancellationsPieChart: React.FC = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cancellations, setCancellations] = useState<CancellationStats | null>(null);
	
	const refresh = () => {
		setLoading(true);
		fetchCancellationStats()
			.then(unwrap)
			.then(setCancellations)
			.catch(err => {
				setError(err.message);
				toast('Error fetching cancellations:', {
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
	}, []);
	
	if (loading) return <>loading</>;
	if (error || !cancellations) return <>error</>;
	
	const chartData = [
		{ type: "cancellations", count: cancellations.cancelled, fill: "var(--color-red-400)" },
		{ type: "normal", count: cancellations.total, fill: "var(--color-green-400)" }
	];
	
	return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<span className="text-md font-semibold pointer-events-none">
					Flight Statuses
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{/*<TotalBadge mode={mode} response={chart} />*/}
				</div>
			</div>
			<ChartContainer
				config={chartConfig}
				className="mx-auto aspect-square max-h-[250px]"
			>
				<PieChart>
					<ChartTooltip
						content={
							<ChartTooltipContent
								indicator="line"
								className="w-[140px]"
							/>
						}
					/>
					
					<Pie
						data={chartData}
						dataKey="count"
						nameKey="type"
						innerRadius={60}
						strokeWidth={5}
					>
						<Label
							content={({ viewBox }) => {
								if (viewBox && "cx" in viewBox && "cy" in viewBox) {
									return (
										<text
											x={viewBox.cx}
											y={viewBox.cy}
											textAnchor="middle"
											dominantBaseline="middle"
										>
											<tspan
												x={viewBox.cx}
												y={viewBox.cy! - 6}
												className="fill-foreground text-[26px] font-bold font-mono tracking-tighter"
											>
												{cancellations.interrupted.toFixed(2)}%
											</tspan>
											<tspan
												x={viewBox.cx}
												y={(viewBox.cy || 0) + 17}
												className="fill-muted-foreground text-[11px]"
											>
												Flights Cancelled
											</tspan>
										</text>
									)
								}
							}}
						/>
					</Pie>
				</PieChart>
			</ChartContainer>
		</div>
	)
}