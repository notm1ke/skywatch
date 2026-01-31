import Link from "next/link";

import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { Squircle } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ErrorSection } from "../error-section";
import { useQuery } from "@tanstack/react-query";
import { cn, shortNumberFormatter } from "~/lib/utils";
import { AnimatedNumber } from "../ui/animated-number";

const busiestAirportMedal = (rank: number) => {
	if (rank === 1) return "bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-950";
	if (rank === 2) return "bg-zinc-400 text-zinc-900 dark:bg-zinc-300 dark:text-zinc-800";
	if (rank === 3) return "bg-amber-600 text-amber-50 dark:bg-amber-700 dark:text-amber-100";
	return "bg-secondary text-muted-foreground/80";
}

const mostCancellationsMedal = (rank: number) => {
	if (rank === 1) return "bg-red-700 text-white dark:bg-red-800";
	if (rank === 2) return "bg-red-500 text-white dark:bg-red-600";
	if (rank === 3) return "bg-red-200 text-red-9900 dark:bg-red-300 dark:text-red-950";
	return "bg-secondary text-muted-foreground/80";
}

export const FlightStatuses: React.FC = () => {
	const { data, isLoading, error, refetch } = useQuery(orpc.traffic.flightStats.queryOptions());
	
	if (isLoading) return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<div className="text-md font-semibold pointer-events-none">
					Flight Statuses
				</div>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono tabular-nums">
					<Skeleton className="w-12 h-6 rounded" />
				</div>
			</div>

			<div className="flex flex-1 flex-col divide-y">
				<div className="p-3 space-y-2">
					<div className="flex h-8 rounded-sm overflow-hidden border border-border mt-px">
						<Skeleton className="w-[92%] rounded-l rounded-r-none" />
						<Skeleton className="bg-accent/70 w-[5%] rounded-none" />
						<Skeleton className="bg-accent/50 w-[3%] rounded-none" />
					</div>
					<div className="flex justify-between text-xs text-muted-foreground">
						{Array.from({ length: 3 }, (_, i) => (
							<div key={i} className="flex flex-row items-center space-x-1">
								<Squircle className="w-4 h-4 text-accent fill-accent animate-pulse" />
								<Skeleton className="w-12 h-4" />
							</div>
						))}
					</div>
				</div>
				<div className="flex-1 grid grid-cols-2 gap-0 divide-x">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							className="px-3 py-2"
							key={`flight-stats-skeleton-details-${i}`}
						>
							<div className="mb-2">
								<Skeleton className="w-24 h-4" />
							</div>
							<div className="space-y-1.5 overflow-auto flex-1">
								{Array.from({ length: 5 }).map((_, j) => (
									<div
										key={`flight-stats-skeleton-details-${i}-${j}`}
										className="flex items-center justify-between gap-2"
									>
										<div className="flex items-center gap-2">
											<Skeleton className="w-5 h-5" />
											<Skeleton className="w-9 h-5" />
										</div>
										
										<div>
											<Skeleton className="w-24 h-4" />
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
	
	if (error || !data) return (
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
				title="Error loading flight statuses"
				error={error?.message}
				refresh={refetch}
			/>
		</div>
	);
	
	// widths
	const cancelledWidth = Math.floor((data.stats.cancelled / data.stats.normal) * 100);
	const delayedWidth = Math.floor((data.stats.delayed / data.stats.normal) * 100);
	const activeWidth = 100 - cancelledWidth - delayedWidth;
	
	// pcts
	const cancelledPct = (data.stats.cancelled / data.stats.total) * 100;
	const delayedPct = (data.stats.delayed / data.stats.total) * 100;
	const activePct = 100 - cancelledPct - delayedPct;
	
	return (
		<div className="border-t sm:border-t-0">
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<span className="text-md font-semibold pointer-events-none">
					Flight Statuses
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{shortNumberFormatter.format(data.stats.total)}
				</div>
			</div>
			
			<div className="flex flex-1 flex-col divide-y">
				<div className="p-3 space-y-2">
					<div className="flex h-8 rounded-sm overflow-hidden border border-border mt-px">
						<div className="flex bg-green-500 items-center justify-center" style={{ width: activeWidth + "%" }}>
							{activeWidth > 15 && <span className="text-white text-xs font-mono tracking-tight text-shadow-md">{activePct.toFixed(1)}%</span>}
						</div>
						<div className="flex bg-amber-500 items-center justify-center" style={{ width: delayedWidth + "%" }}>
							{delayedWidth > 15 && <span className="text-white text-xs font-mono tracking-tight text-shadow-md">{delayedPct.toFixed(1)}%</span>}
						</div>
						<div className="flex bg-red-500 items-center justify-center" style={{ width: cancelledWidth + "%" }}>
							{cancelledWidth > 15 && <span className="text-white text-xs font-mono tracking-tight text-shadow-md">{cancelledPct.toFixed(1)}%</span>}
						</div>
					</div>
					<div className="flex justify-between text-xs text-muted-foreground">
						<div className="flex flex-row items-center space-x-1">
							<Squircle className="size-3 text-green-400 fill-green-500" />
							<span>
								Normal: <AnimatedNumber value={data.stats.normal} className="font-mono tracking-tighter" />
							</span>
						</div>
						<div className="flex flex-row items-center space-x-1">
							<Squircle className="size-3 text-amber-400 fill-amber-500" />
							<span>
								Delayed: <AnimatedNumber value={data.stats.delayed} className="font-mono tracking-tighter" />
							</span>
						</div>
						<div className="flex flex-row items-center space-x-1">
							<Squircle className="size-3 text-red-400 fill-red-500" />
							<span>
								Cancelled: <AnimatedNumber value={data.stats.cancelled} className="font-mono tracking-tighter" />
							</span>
						</div>
					</div>
				</div>
				
				<div className="flex-1 grid grid-cols-2 gap-0 divide-x">
					<div className="px-3 py-2">
						<div className="text-xs font-semibold text-muted-foreground mb-2">Busiest Airports</div>
						<div className="space-y-1.5 overflow-auto flex-1">
							{data
								.busiest
								.sort((a, b) => b.total_flights - a.total_flights)
								.map((record, i) => (
									<motion.div
										key={`busiest-airport-${record.iata_code}`}
										className="flex items-center justify-between text-xs gap-2"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ delay: i * (50 / 1000) }}
									>
										<div className="flex items-center gap-2">
											<div className={cn(
												"rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold",
												busiestAirportMedal(i + 1)
											)}>
												{i + 1}
											</div>
											
											<Link
												prefetch
												href={`/airports/${record.iata_code}`}
												className="font-mono font-semibold text-foreground"
											>
												{record.iata_code}
											</Link>
										</div>
										<span className="font-mono text-muted-foreground pointer-events-none">
											{record.total_flights.toLocaleString()} flight{record.total_flights === 1 ? "" : "s"}
										</span>
									</motion.div>
								))}
						</div>
					</div>
					<div className="px-3 py-2">
						<div className="text-xs font-semibold text-muted-foreground mb-2">Most Cancellations</div>
						<div className="space-y-1.5 overflow-auto flex-1">
							{data
								.mostCancelled
								.sort((a, b) => b.cancelled_flights - a.cancelled_flights)
								.map((record, i) => (
									<motion.div
										key={`busiest-airport-${record.iata_code}`}
										className="flex items-center justify-between text-xs gap-2"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ delay: i * (50 / 1000) }}
									>
										<div className="flex items-center gap-2">
											<div className={cn(
												"rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold",
												mostCancellationsMedal(i + 1)
											)}>
												{i + 1}
											</div>
											<Link
												prefetch
												href={`/airports/${record.iata_code}`}
												className="font-mono font-semibold text-foreground"
											>
												{record.iata_code}
											</Link>
										</div>
										<span className="font-mono text-muted-foreground pointer-events-none">
											{record.cancelled_flights.toLocaleString()} flight{record.cancelled_flights === 1 ? "" : "s"}
										</span>
									</motion.div>
								))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}