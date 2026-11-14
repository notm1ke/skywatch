"use client";

import { cn } from "cnfast";
import { ReactNode } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { Query, TrafficSummary, zuluLabel } from "./shared";

const Tile: React.FC<{ label: string; value: ReactNode; sub?: ReactNode; className?: string; tone?: "warn" }> = ({
	label, value, sub, className, tone
}) => (
	<div className={cn("min-w-0 px-3 py-3", className)}>
		<div className="text-xs text-muted-foreground">{label}</div>
		<div className={cn("mt-0.5 font-mono text-2xl font-semibold tabular-nums", tone === "warn" && "text-orange-600 dark:text-orange-400")}>
			{value}
		</div>
		<div className="mt-0.5 min-h-4 text-xs text-muted-foreground">{sub}</div>
	</div>
);

const aarText = (s: TrafficSummary) => {
	const { min, max } = s.aar;
	if (min == null || max == null) return `${s.defaultAar}`;
	return min === max ? `${max}` : `${min}–${max}`;
};

export const KpiStrip: React.FC<{ query: Query<TrafficSummary> }> = ({ query }) => {
	const grid = "grid grid-cols-2 lg:grid-cols-4 border-b [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-l lg:[&>*:not(:first-child)]:border-l";
	const s = query.data;

	if (!s) return (
		<div className={grid}>
			{[0, 1, 2, 3].map(i => (
				<div key={i} className="px-3 py-3">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="mt-2 h-7 w-20" />
					<Skeleton className="mt-2 h-3 w-32" />
				</div>
			))}
		</div>
	);

	const cancelledPct = s.totalFlights ? (s.cancelledFlights / s.totalFlights) * 100 : 0;
	const approx = s.aar.source !== "recorded";
	const peakOver = s.peakHour?.aar != null && s.peakHour.arrivals > s.peakHour.aar;

	return (
		<div className={grid}>
			<Tile
				label="Scheduled arrivals"
				value={s.totalFlights.toLocaleString()}
				sub={`${s.listedArrivals.toLocaleString()} in stored buckets`}
			/>
			<Tile
				label="Cancelled"
				value={s.cancelledFlights.toLocaleString()}
				sub={`${cancelledPct.toFixed(1)}% of scheduled`}
				tone={cancelledPct >= 10 ? "warn" : undefined}
			/>
			<Tile
				label="Peak hour"
				value={s.peakHour ? s.peakHour.arrivals.toLocaleString() : "—"}
				sub={s.peakHour
					? <>from {zuluLabel(s.peakHour.time)}{s.peakHour.aar != null && <> · AAR {s.peakHour.aar}{approx && "*"}</>}</>
					: "No full hour yet"}
				tone={peakOver ? "warn" : undefined}
			/>
			<Tile
				label={`Arrival rate (AAR)${approx ? "*" : ""}`}
				value={aarText(s)}
				sub={s.overCapacityHours != null
					? `${s.overCapacityHours} of ${s.hoursEvaluated} hours over AAR${approx ? "*" : ""}`
					: "No AAR to compare"}
				tone={s.overCapacityHours ? "warn" : undefined}
			/>
		</div>
	);
};
