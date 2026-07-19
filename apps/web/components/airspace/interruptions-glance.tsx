"use client";

import { cn } from "cnfast";
import { useMemo } from "react";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { InterruptionEvent } from "~/lib/schemas";
import { useAirspaceInteractivity } from "./store";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TYPE_COLOR, TYPE_LABEL, TYPE_RANK, TYPE_STROKE } from "./interruption-types";

const WINDOW_MS = 3 * 60 * 60 * 1000; // 3h
const BUCKETS = 36; // 5-min buckets, matching the airport-status cron cadence
const SVG_W = 72;
const SVG_H = 20;

export const InterruptionsGlance = () => {
	const { active } = useAirspaceInteractivity();

	const { data } = useQuery(orpc.airspace.historical.interruptionHistory.queryOptions({
		input: {
			airspace: active === "any" ? undefined : active
		}
	}));

	const events = useMemo(() => data ?? [], [data]);

	const { linePath, areaPath, recent, strokeColor } = useMemo(() => {
		const now = Date.now();
		const windowStart = now - WINDOW_MS;
		const bucketMs = WINDOW_MS / BUCKETS;

		const counts = Array.from({ length: BUCKETS }, (_, i) => {
			const bucketStart = windowStart + i * bucketMs;
			const bucketEnd = bucketStart + bucketMs;
			return events.reduce((count, event) => {
				const start = new Date(event.observed_at).getTime();
				const end = event.resolved_at ? new Date(event.resolved_at).getTime() : now;
				return (start < bucketEnd && end > bucketStart) ? count + 1 : count;
			}, 0);
		});

		const recentEvents = events
			.filter(event => {
				const start = new Date(event.observed_at).getTime();
				const end = event.resolved_at ? new Date(event.resolved_at).getTime() : now;
				return start < now && end > windowStart;
			})
			.sort((a, b) =>
				TYPE_RANK[b.event_type] - TYPE_RANK[a.event_type] ||
				a.airport_iata.localeCompare(b.airport_iata)
			);

		const worstType = recentEvents.reduce<InterruptionEvent["event_type"] | null>((worst, event) => {
			if (!worst || TYPE_RANK[event.event_type] > TYPE_RANK[worst]) return event.event_type;
			return worst;
		}, null);

		const max = Math.max(1, ...counts);
		const points = counts.map((count, i) => {
			const x = (i / (BUCKETS - 1)) * SVG_W;
			const y = SVG_H - 2 - (count / max) * (SVG_H - 4);
			return [x, y] as const;
		});

		const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
		const area = `M0,${SVG_H} L${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")} L${SVG_W},${SVG_H} Z`;

		return {
			linePath: line,
			areaPath: area,
			recent: recentEvents,
			strokeColor: worstType ? TYPE_STROKE[worstType] : "var(--color-blue-400)"
		};
	}, [events]);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex items-center gap-2 px-4 text-sm whitespace-nowrap shrink-0">
					<svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="shrink-0">
						<path d={areaPath} fill={strokeColor} opacity={0.14} />
						<path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
					</svg>
					<span>
						<span className="font-semibold">{recent.length}</span>{" "}
						<span className="text-zinc-500 dark:text-zinc-400">
							interruption{recent.length === 1 ? "" : "s"} in last 3h
						</span>
					</span>
				</div>
			</TooltipTrigger>
			<TooltipContent side="top">
				<div className="font-semibold mb-1">Activity in last 3h</div>
				{recent.length === 0 ? (
					<div className="opacity-70 text-[11px]">No interruptions</div>
				) : (
					<div className="flex gap-1.5 flex-wrap max-w-[280px]">
						{recent.map(event => (
							<span
								key={event.event_id}
								className="inline-flex items-center gap-1.5 rounded bg-white/10 dark:bg-black/10 pr-1.5 text-[11px]"
							>
								<span className={cn(
									"font-mono font-bold text-[10.5px] text-zinc-900 px-1.5 py-px rounded-[2px]",
									TYPE_COLOR[event.event_type]
								)}>
									{event.airport_iata}
								</span>
								{TYPE_LABEL[event.event_type]}
							</span>
						))}
					</div>
				)}
			</TooltipContent>
		</Tooltip>
	);
};
