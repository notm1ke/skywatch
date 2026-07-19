"use client";

import { useMemo } from "react";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { shortNumberFormatter } from "~/lib/utils";
import { useAirspaceInteractivity } from "./store";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const LOOKBACK_BUCKETS = 12; // ~3h at the underlying 15-min buckets
const SVG_W = 72;
const SVG_H = 20;

export const FlightsGlance = () => {
	const { active } = useAirspaceInteractivity();

	const { data } = useQuery(orpc.traffic.statuses.queryOptions({
		input: {
			airspace: active === "any" ? undefined : active
		}
	}));

	const { bars, total, lastBucket } = useMemo(() => {
		const points = data?.data ?? [];
		const recent = points.slice(-LOOKBACK_BUCKETS);
		const startIndex = points.length - recent.length;

		// "cumulative" is a running total across all status categories, so the
		// per-bucket volume is just the delta between consecutive entries
		const values = recent.map((point, i) => {
			const globalIndex = startIndex + i;
			const prev = globalIndex > 0 ? points[globalIndex - 1].cumulative : 0;
			return Math.max(0, point.cumulative - prev);
		});

		return {
			bars: values,
			total: values.reduce((sum, v) => sum + v, 0),
			lastBucket: values.at(-1) ?? 0
		};
	}, [data]);

	const max = Math.max(1, ...bars);

	const trigger = (
		<div className="flex items-center gap-2 px-4 text-sm whitespace-nowrap shrink-0">
			<svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="shrink-0">
				{bars.map((value, i) => {
					const width = SVG_W / bars.length;
					const height = value > 0 ? Math.max(1, (value / max) * (SVG_H - 2)) : 0;
					return (
						<rect
							key={i}
							x={i * width}
							y={SVG_H - height}
							width={Math.max(0, width - 1)}
							height={height}
							rx={0.75}
							className="fill-blue-500"
						/>
					);
				})}
			</svg>
			<span>
				<span className="font-semibold">{shortNumberFormatter.format(total)}</span>{" "}
				<span className="text-zinc-500 dark:text-zinc-400">flights in last 3h</span>
			</span>
		</div>
	);

	if (bars.length === 0) return trigger;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{trigger}</TooltipTrigger>
			<TooltipContent side="top">
				<div className="font-semibold">{shortNumberFormatter.format(lastBucket)} flights observed in last 15 min</div>
				<div className="opacity-75 mt-0.5">
					peak {shortNumberFormatter.format(Math.max(0, ...bars))} · avg {shortNumberFormatter.format(Math.round(total / bars.length))} per 15 min
				</div>
			</TooltipContent>
		</Tooltip>
	);
};
