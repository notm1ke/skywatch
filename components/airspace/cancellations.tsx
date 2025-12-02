import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import { ErrorSection } from "../error-section";
import { Label, Pie, PieChart } from "recharts";
import { shortNumberFormatter } from "~/lib/utils";
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
	const [stats, setStats] = useState<CancellationStats | null>(null);
	
	const refresh = () => {
		setLoading(true);
		fetchCancellationStats()
			.then(unwrap)
			.then(setStats)
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
	
	if (loading) return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<div className="text-md font-semibold pointer-events-none">
					Flight Statuses
				</div>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono tabular-nums">
					<Skeleton className="w-12 h-6 rounded" />
				</div>
			</div>

			<ChartContainer
				config={chartConfig}
				className="mx-auto aspect-square max-h-[250px] relative"
			>
				<div className="flex items-center justify-center w-full h-full relative">
					<Skeleton className="w-40 h-40 rounded-full" />
					<div className="absolute w-20 h-20 rounded-full bg-white dark:bg-background pointer-events-none z-40" />
				</div>
			</ChartContainer>
		</div>
	);
	
	if (error || !stats) return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<div className="text-md font-semibold pointer-events-none">
					Flight Statuses
				</div>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono tabular-nums">
					<Skeleton className="w-12 h-6 rounded" />
				</div>
			</div>

			<ErrorSection
				title="Error loading flight stats"
				error={error}
				refresh={refresh}
			/>
		</div>
	);
	
	const chartData = [
		{ type: "cancellations", count: stats.cancelled, fill: "var(--color-red-400)" },
		{ type: "normal", count: stats.total, fill: "var(--color-green-400)" }
	];
	
	return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<span className="text-md font-semibold pointer-events-none">
					Flight Statuses
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{shortNumberFormatter.format(stats.total)}
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
												{stats.interrupted.toFixed(2)}%
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