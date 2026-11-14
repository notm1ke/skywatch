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

// Stacked from the baseline up, the most severe at the bottom: the total height is how many airports have something
// going on, and each color's share of it is readable on its own. (Drawn as separate overlapping areas the translucent
// colors blended into mud wherever two types overlapped.)
const STACK: LayerKey[] = ["closure", "groundStop", "delay"];
const FILL_OPACITY = 0.5;

const SVG_W = 1000;
const SVG_H = 26;

// scale height against a fixed ceiling instead of whatever's in view — a lone
// sustained event shouldn't fill the track just because nothing else is
// concurrent with it (see: the ZBW long-closure case)
const STACK_REF_MAX = 6;

// anything happening is at least this tall, so a single event doesn't vanish next to a busy afternoon
const MIN_PX = 3;

const MAX_CHIPS = 12;

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

const pathFromPoints = (points: Point[], move = true) =>
	points.map(([x, y], i) => `${i === 0 && move ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

type LayerBand = { key: string; area: string; edge: string };

/**
 * One band per run of buckets where this type has activity. A band sits on top of the types stacked below it, so its
 * outline follows the running total; where a type has no activity nothing is drawn, so there's no false "zero line".
 */
const buildBands = (buckets: TypeBucket[], layer: LayerKey, scaleMax: number): LayerBand[] => {
	const stepW = SVG_W / buckets.length;
	const below = STACK.slice(0, STACK.indexOf(layer));

	const lower = buckets.map(bucket => below.reduce((sum, key) => sum + bucket[key], 0));
	const upper = buckets.map((bucket, i) => lower[i] + bucket[layer]);

	// 0 stays on the baseline; anything above it starts at MIN_PX
	const y = (units: number) => SVG_H - (units <= 0 ? 0 : MIN_PX + (SVG_H - MIN_PX) * Math.min(units / scaleMax, 1));

	const runs: { start: number; end: number }[] = [];
	buckets.forEach((bucket, i) => {
		const last = runs[runs.length - 1];
		if (bucket[layer] > 0 && last && last.end === i) last.end = i + 1;
		else if (bucket[layer] > 0) runs.push({ start: i, end: i + 1 });
	});

	return runs.map(run => {
		const top: Point[] = [];
		const bottom: Point[] = [];

		for (let i = run.start; i < run.end; i++) {
			top.push([i * stepW, y(upper[i])], [(i + 1) * stepW, y(upper[i])]);
		}

		for (let i = run.end - 1; i >= run.start; i--) {
			bottom.push([(i + 1) * stepW, y(lower[i])], [i * stepW, y(lower[i])]);
		}

		return {
			key: `${layer}-${run.start}`,
			area: `${pathFromPoints(top)} ${pathFromPoints(bottom, false)} Z`,
			edge: pathFromPoints(top)
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

	const { data, isLoading } = useQuery(orpc.airspace.historical.interruptionHistory.queryOptions({
		input: {
			airspace: active === "any" ? undefined : active
		}
	}));

	const events = useMemo(() => data ?? [], [data]);
	const now = useMemo(() => Date.now(), [data]);
	const { buckets: typeBuckets, windowStart } = useMemo(() => bucketizeByType(events, now), [events, now]);

	const scaleMax = useMemo(() => {
		const observedMax = Math.max(0, ...typeBuckets.map(bucket => bucket.delay + bucket.groundStop + bucket.closure));
		return Math.max(STACK_REF_MAX, observedMax);
	}, [typeBuckets]);

	const layers = useMemo(
		() => STACK.map(key => ({
			key,
			color: LAYER_COLOR[key],
			bands: buildBands(typeBuckets, key, scaleMax)
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

	const goLive = () => {
		setIsLive(true);
		setRawFrac(1);
	};

	return (
		<div className="flex flex-1 min-w-0 items-stretch divide-x">
			<div className="relative flex-1 min-w-0 flex items-center px-4">
				<div
					ref={trackRef}
					className="relative w-full h-[26px] cursor-crosshair"
					onPointerEnter={() => setPreviewing(true)}
					onPointerMove={event => {
						setPreviewing(true);
						updateFromClientX(event.clientX);
					}}
					onPointerLeave={() => {
						setPreviewing(false);
						goLive();
					}}
				>
					<div className="absolute inset-x-0 bottom-0 h-px bg-border" />

					{isLoading && <div className="absolute inset-x-0 bottom-0 h-1.5 animate-pulse rounded-full bg-muted" />}

					{!isLoading && events.length === 0 && (
						<div className="absolute inset-0 flex items-center justify-center pb-1 text-xs text-muted-foreground pointer-events-none">
							No interruptions in the last 24 hours
						</div>
					)}

					<svg
						viewBox={`0 0 ${SVG_W} ${SVG_H}`}
						preserveAspectRatio="none"
						className="absolute inset-0 w-full h-full"
					>
						{layers.map(layer => layer.bands.map(band => (
							<g key={band.key}>
								<path d={band.area} fill={layer.color} fillOpacity={FILL_OPACITY} />
								{/* the track is stretched to fit, so keep the line the same weight in both directions */}
								<path
									d={band.edge}
									fill="none"
									stroke={layer.color}
									strokeWidth={1.25}
									strokeLinejoin="round"
									vectorEffect="non-scaling-stroke"
								/>
							</g>
						)))}
					</svg>

					{/* when looking back, the "future" side of the cursor fades out */}
					{previewing && !isLive && (
						<div
							className="absolute inset-y-0 right-0 bg-background/60 pointer-events-none"
							style={{ left: `${frac * 100}%` }}
						/>
					)}

					{previewing && (
						<div
							className="absolute -top-1 -bottom-1 w-0.5 bg-blue-500 pointer-events-none"
							style={{ left: `${frac * 100}%` }}
						>
							<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-blue-500 border-2 border-background" />

							{/* anchored by the cursor's position along the track, so it never hangs off either end */}
							<div
								className="absolute bottom-full left-1/2 z-50 mb-2.5 max-w-[340px] w-max rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-md"
								style={{ transform: `translateX(-${frac * 100}%)` }}
							>
								<div className="flex items-center gap-1.5 font-semibold tabular-nums">
									{fmtDateTime(scrubTime)}
									<span className="font-normal opacity-70">· {open.length} active</span>
								</div>

								{open.length === 0 ? (
									<div className="mt-1 text-[11px] opacity-70">No active interruptions</div>
								) : (
									<div className="mt-1.5 flex gap-1.5 flex-wrap">
										{open.slice(0, MAX_CHIPS).map(event => (
											<span
												key={event.event_id}
												className="inline-flex items-center gap-1.5 rounded-r-[2px] bg-background/10 pr-1.5 text-[11px]"
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

										{open.length > MAX_CHIPS && (
											<span className="inline-flex items-center px-1 text-[11px] opacity-70">
												+{open.length - MAX_CHIPS} more
											</span>
										)}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center px-4">
				<button
					type="button"
					onClick={goLive}
					disabled={isLive}
					className={cn(
						"flex shrink-0 w-20 items-center justify-center gap-1.5 whitespace-nowrap text-[10.5px] font-mono font-semibold tabular-nums px-2 py-1 rounded-sm transition-colors",
						isLive
							? "bg-green-500/15 text-green-500 cursor-default"
							: "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-400 dark:hover:bg-zinc-700"
					)}
				>
					{isLive && (
						<span className="relative flex size-1.5">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
							<span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
						</span>
					)}
					{isLive ? "Live" : fmtTime(scrubTime)}
				</button>
			</div>
		</div>
	);
};
