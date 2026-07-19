"use client";

import { cn } from "cnfast";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { InterruptionEvent } from "~/lib/schemas";
import { useAirspaceInteractivity } from "./store";
import { useMemo, useRef, useState } from "react";
import { EventType, TYPE_COLOR, TYPE_LABEL, TYPE_RANK, TYPE_STROKE } from "./interruption-types";

const WINDOW_MS = 24 * 60 * 60 * 1000;
// 5-min buckets, matching the airport-status cron's recording cadence — any
// coarser and a bucket can visually "smear" activity earlier than its real
// start time (a whole bucket lights up the instant anything overlaps it)
const BUCKETS = 288;

type LayerKey = "delay" | "groundStop" | "closure";
type TypeBucket = Record<LayerKey, number>;
type Point = [number, number];

const LAYER_GROUP: Record<EventType, LayerKey> = {
	airport_closure: "closure",
	ground_stop: "groundStop",
	ground_delay: "delay",
	dual_delay: "delay",
	arrival_delay: "delay",
	departure_delay: "delay"
};

const LAYER_COLOR: Record<LayerKey, string> = {
	delay: TYPE_STROKE.ground_delay,
	groundStop: TYPE_STROKE.ground_stop,
	closure: TYPE_STROKE.airport_closure
};

// heavier types drawn last (on top); order matters for the semi-transparent overlap
const LAYER_KEYS: LayerKey[] = ["delay", "groundStop", "closure"];
const LAYER_OPACITY: Record<LayerKey, number> = {
	delay: 0.35,
	groundStop: 0.4,
	closure: 0.45
};

const SVG_W = 1000;
const SVG_H = 26;

// scale height against a fixed ceiling instead of whatever's in view — a lone
// sustained event shouldn't fill the track just because nothing else is
// concurrent with it (see: the ZBW long-closure case)
const LAYER_REF_MAX = 3;

const bucketizeByType = (events: InterruptionEvent[], now: number) => {
	const windowStart = now - WINDOW_MS;
	const bucketMs = WINDOW_MS / BUCKETS;

	const buckets: TypeBucket[] = Array.from({ length: BUCKETS }, (_, i) => {
		const bucketStart = windowStart + i * bucketMs;
		const bucketEnd = bucketStart + bucketMs;
		const result: TypeBucket = { delay: 0, groundStop: 0, closure: 0 };

		for (const event of events) {
			const start = new Date(event.observed_at).getTime();
			const end = event.resolved_at ? new Date(event.resolved_at).getTime() : now;
			if (start >= bucketEnd || end <= bucketStart) continue;
			result[LAYER_GROUP[event.event_type]]++;
		}

		return result;
	});

	return { buckets, windowStart };
};

const stepTopPoints = (values: number[], width: number, height: number, scaleMax: number): Point[] => {
	const stepW = width / values.length;
	const points: Point[] = [];
	values.forEach((value, i) => {
		const y = height - (value / scaleMax) * height;
		points.push([i * stepW, y]);
		points.push([(i + 1) * stepW, y]);
	});
	return points;
};

const pathFromPoints = (points: Point[]) =>
	points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const areaFromPointsRange = (points: Point[], height: number, startX: number, endX: number) =>
	`${pathFromPoints(points)} L${endX.toFixed(1)},${height.toFixed(1)} L${startX.toFixed(1)},${height.toFixed(1)} Z`;

type LayerSegment = { key: string; area: string };

// only draw where a type actually has activity — a step at value 0 sits
// exactly on the baseline, so drawing it unconditionally would paint a solid
// colored "zero line" that falsely reads as that type being present
const buildLayerSegments = (buckets: TypeBucket[], key: LayerKey, scaleMax: number): LayerSegment[] => {
	const stepW = SVG_W / buckets.length;
	const values = buckets.map(bucket => bucket[key]);
	const segments: { start: number; end: number }[] = [];

	values.forEach((value, i) => {
		const last = segments[segments.length - 1];
		if (value > 0 && last && last.end === i) last.end = i + 1;
		else if (value > 0) segments.push({ start: i, end: i + 1 });
	});

	return segments.map(seg => {
		const segValues = values.slice(seg.start, seg.end);
		const segWidth = (seg.end - seg.start) * stepW;
		const points = stepTopPoints(segValues, segWidth, SVG_H, scaleMax)
			.map(([x, y]): Point => [x + seg.start * stepW, y]);
		const startX = seg.start * stepW;
		const endX = seg.end * stepW;

		return {
			key: `${key}-${seg.start}`,
			area: areaFromPointsRange(points, SVG_H, startX, endX)
		};
	});
};

const openAt = (events: InterruptionEvent[], t: number, now: number) =>
	events
		.filter(event => {
			const start = new Date(event.observed_at).getTime();
			const end = event.resolved_at ? new Date(event.resolved_at).getTime() : now + 1;
			return start <= t && end >= t;
		})
		.sort((a, b) =>
			TYPE_RANK[b.event_type] - TYPE_RANK[a.event_type] ||
			a.airport_iata.localeCompare(b.airport_iata)
		);

const fmtTime = (t: number) => new Date(t).toLocaleTimeString(
	[],
	{ hour: "numeric", minute: "2-digit" }
);

const fmtDateTime = (t: number) => new Date(t).toLocaleString(
	[],
	{ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
);

// hysteresis band for the live/scrubbed edge: a single threshold flickers
// when the pointer rests near it, since sub-pixel jitter keeps crossing it.
// Separate enter/exit thresholds with a dead zone between them fix that.
const LIVE_ENTER = 0.99;
const LIVE_EXIT = 0.95;

export const InterruptionTimeline = () => {
	const { active } = useAirspaceInteractivity();
	const trackRef = useRef<HTMLDivElement>(null);
	const [rawFrac, setRawFrac] = useState(1);
	const [isLive, setIsLive] = useState(true);
	const [previewing, setPreviewing] = useState(false);

	const { data } = useQuery(orpc.airspace.historical.interruptionHistory.queryOptions({
		input: {
			airspace: active === "any" ? undefined : active
		}
	}));

	const events = useMemo(() => data ?? [], [data]);
	const now = useMemo(() => Date.now(), [data]);
	const { buckets: typeBuckets, windowStart } = useMemo(() => bucketizeByType(events, now), [events, now]);

	const scaleMax = useMemo(() => {
		const observedMax = Math.max(0, ...typeBuckets.flatMap(bucket => [bucket.delay, bucket.groundStop, bucket.closure]));
		return Math.max(LAYER_REF_MAX, observedMax, 1);
	}, [typeBuckets]);

	const layers = useMemo(
		() => LAYER_KEYS.map(key => ({
			key,
			color: LAYER_COLOR[key],
			opacity: LAYER_OPACITY[key],
			segments: buildLayerSegments(typeBuckets, key, scaleMax)
		})),
		[typeBuckets, scaleMax]
	);

	const frac = isLive ? 1 : rawFrac;
	const scrubTime = windowStart + frac * WINDOW_MS;
	const open = useMemo(() => openAt(events, scrubTime, now), [events, scrubTime, now]);

	const updateFromClientX = (clientX: number) => {
		const rect = trackRef.current?.getBoundingClientRect();
		if (!rect || !rect.width) return;
		const raw = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		setRawFrac(raw);
		setIsLive(prev => {
			if (raw > LIVE_ENTER) return true;
			if (raw < LIVE_EXIT) return false;
			return prev; // dead zone: keep whatever state we were already in
		});
	};

	return (
		<div className="flex flex-1 min-w-0 items-stretch divide-x">
			<div className="relative flex-1 min-w-0 flex items-center px-4">
				<div
					ref={trackRef}
					className="relative w-full h-[26px] cursor-pointer"
					onPointerEnter={() => setPreviewing(true)}
					onPointerMove={event => {
						setPreviewing(true);
						updateFromClientX(event.clientX);
					}}
					onPointerLeave={() => {
						setPreviewing(false);
						setIsLive(true);
						setRawFrac(1);
					}}
				>
					<div className="absolute inset-x-0 bottom-0 h-px bg-zinc-300 dark:bg-zinc-700" />
					<svg
						viewBox={`0 0 ${SVG_W} ${SVG_H}`}
						preserveAspectRatio="none"
						className="absolute inset-0 w-full h-full"
					>
						{layers.map(layer => layer.segments.map(segment => (
							<path
								key={segment.key}
								d={segment.area}
								fill={layer.color}
								fillOpacity={layer.opacity}
								stroke={layer.color}
								strokeWidth={1}
								strokeOpacity={0.9}
							/>
						)))}
					</svg>

					<div
						className="absolute -top-1 -bottom-1 w-0.5 bg-blue-500 pointer-events-none"
						style={{ left: `${frac * 100}%` }}
					>
						<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-900" />

						{previewing && (
							<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 rounded-md px-2 py-1.5 text-xs whitespace-nowrap shadow-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900">
								<div className="flex items-center gap-1.5 font-semibold tabular-nums mb-1">
									{fmtDateTime(scrubTime)}
									<span>· {open.length} active</span>
								</div>
								{open.length === 0 ? (
									<div className="opacity-70 text-[11px]">No active interruptions</div>
								) : (
									<div className="flex gap-1.5 flex-wrap max-w-[340px]">
										{open.map(event => (
											<span
												key={event.event_id}
												className="inline-flex items-center gap-1.5 rounded-r-[2px] bg-white/10 dark:bg-black/10 pr-1.5 text-[11px]"
											>
												<span className={cn(
													"font-mono font-bold text-[10.5px] text-zinc-900 px-1.5 py-px rounded-l-[2px]",
													TYPE_COLOR[event.event_type]
												)}>
													{event.airport_iata}
												</span>
												{TYPE_LABEL[event.event_type]}
											</span>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center px-4">
				<div
					className={cn(
						"shrink-0 w-20 text-center whitespace-nowrap text-[10.5px] font-mono font-semibold tabular-nums px-2 py-1 rounded-sm",
						isLive
							? "bg-green-500/15 text-green-500"
							: "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-400 dark:hover:bg-zinc-700"
					)}
					onClick={() => {
						setIsLive(true);
						setRawFrac(1);
					}}
				>
					{isLive ? "Live" : fmtTime(scrubTime)}
				</div>
			</div>
		</div>
	);
};
