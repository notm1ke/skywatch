"use client";

import { cn } from "cnfast";
import { useEffect, useMemo, useState } from "react";
import { ReferenceCard } from "../reference/primitives";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";

import {
	ChartLegend,
	Query,
	QueryBody,
	TrafficDemand,
	formatDay,
	formatDuration,
	hourLabel,
	instantLabel,
	localClock,
	zuluLabel
} from "./shared";

type Mode = "hourly" | "quarter";

const PROGRAM_STYLE: Record<string, { label: string; color: string }> = {
	ground_stop: { label: "Ground stop", color: "var(--color-red-500)" },
	airport_closure: { label: "Airport closure", color: "var(--color-red-500)" },
	ground_delay: { label: "Ground delay", color: "var(--color-orange-500)" },
	dual_delay: { label: "Arrival/departure delay", color: "var(--color-yellow-500)" },
	arrival_delay: { label: "Arrival delay", color: "var(--color-yellow-500)" },
	departure_delay: { label: "Departure delay", color: "var(--color-yellow-500)" },
};

type Row = {
	key: string;
	onTime: number;
	delayed: number;
	irregular: number;
	/** Capacity in the chart's own unit: AAR per hour, or AAR / 4 per 15 min. */
	capacity: number | null;
	aar: number | null;
};

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

/** Snap a Zulu "HHMM" to the first chart category at or after it. */
const snap = (keys: string[], candidate: string) => keys.find(key => key >= candidate) ?? keys.at(-1);

const toKey = (ms: number, dayStart: number, mode: Mode) => {
	const minutes = Math.max(0, Math.min(1439, Math.floor((ms - dayStart) / 60000)));
	const step = mode === "quarter" ? 15 : 60;
	const floored = Math.floor(minutes / step) * step;
	return `${Math.floor(floored / 60).toString().padStart(2, "0")}${(floored % 60).toString().padStart(2, "0")}`;
};

export const DemandCard: React.FC<{ query: Query<TrafficDemand>; timezone: string | null; className?: string }> = ({
	query, timezone, className
}) => {
	const [mode, setMode] = useState<Mode>("quarter");

	const toggle = (
		<div className="flex rounded-md bg-muted p-0.5 text-xs">
			{([["hourly", "Hourly"], ["quarter", "15 min"]] as const).map(([value, label]) => (
				<button
					key={value}
					onClick={() => setMode(value)}
					className={cn(
						"cursor-pointer rounded px-2 py-0.5 transition-colors",
						mode === value ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
					)}
				>
					{label}
				</button>
			))}
		</div>
	);

	return (
		<ReferenceCard title="Arrival demand vs capacity" actions={toggle} className={className}>
			<QueryBody query={query} height={290} title="Couldn't load arrival demand">
				{demand => <DemandChart demand={demand} mode={mode} timezone={timezone} />}
			</QueryBody>
		</ReferenceCard>
	);
};

const DemandChart: React.FC<{ demand: TrafficDemand; mode: Mode; timezone: string | null }> = ({ demand, mode, timezone }) => {
	// the "now" marker; ticks each minute so a tab left open keeps up
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(timer);
	}, []);

	const rows = useMemo<Row[]>(() => {
		if (mode === "quarter") return demand.buckets.map(b => ({
			key: b.time,
			onTime: b.onTime,
			delayed: b.delayed,
			irregular: b.irregular,
			aar: b.aar,
			capacity: b.aar == null ? null : b.aar / 4
		}));

		return [...Map.groupBy(demand.buckets, b => b.time.slice(0, 2)).entries()].map(([hour, buckets]) => ({
			key: `${hour}00`,
			onTime: sum(buckets.map(b => b.onTime)),
			delayed: sum(buckets.map(b => b.delayed)),
			irregular: sum(buckets.map(b => b.irregular)),
			aar: buckets[0].aar,
			capacity: buckets[0].aar
		}));
	}, [demand, mode]);

	if (!rows.length) return <div className="px-3 py-8 text-center text-sm text-muted-foreground">No arrivals recorded for this day.</div>;

	const keys = rows.map(r => r.key);
	const dayStart = Date.parse(`${demand.date}T00:00:00Z`);
	const dayEnd = dayStart + 86_400_000;
	const isToday = demand.date === new Date(now).toISOString().slice(0, 10);
	const nowKey = isToday ? snap(keys, toKey(now, dayStart, mode)) : undefined;

	const programs = demand.programs.flatMap(program => {
		const start = snap(keys, toKey(Math.max(dayStart, Date.parse(program.firstSeen)), dayStart, mode));
		const end = snap(keys, toKey(program.resolvedAt ? Math.min(dayEnd - 1, Date.parse(program.resolvedAt)) : dayEnd - 1, dayStart, mode));
		const style = PROGRAM_STYLE[program.type];
		return start && end && style ? [{ ...program, start, end, ...style }] : [];
	});

	const aarNote = demand.aarSource === "approximate"
		? "AAR is approximate: the hourly rates weren't recorded for this day, so the stored rate is drawn flat."
		: demand.aarSource === "default"
			? "AAR is the airport's default rate: hourly rates weren't recorded for this day, so time-of-day changes aren't shown."
			: null;

	const config = {
		onTime: { label: "On time", color: "var(--color-green-400)" },
		delayed: { label: "Delayed / EDCT", color: "var(--color-yellow-400)" },
		irregular: { label: "Irregular", color: "var(--color-red-400)" },
		capacity: { label: mode === "hourly" ? "AAR (per hour)" : "AAR ÷ 4 (per 15 min)", color: "var(--color-sky-500)" },
	} satisfies ChartConfig;

	return (
		<div>
			<div className="px-2 pt-3">
				<ChartContainer config={config} className="aspect-auto h-[260px] w-full">
					<ComposedChart data={rows} margin={{ left: 0, right: 8, top: 4 }} accessibilityLayer>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="key"
							tickLine={false}
							axisLine={false}
							interval={mode === "quarter" ? 7 : 2}
							tickFormatter={(key: string) => hourLabel(key)}
						/>
						<YAxis width={34} axisLine={false} tickLine={false} allowDecimals={false} />

						{programs.map(program => (
							<ReferenceArea
								key={`${program.type}-${program.firstSeen}`}
								x1={program.start}
								x2={program.end}
								fill={program.color}
								fillOpacity={0.12}
								stroke={program.color}
								strokeOpacity={0.35}
								strokeDasharray="3 3"
							/>
						))}

						{nowKey && <ReferenceLine x={nowKey} stroke="var(--color-foreground)" strokeOpacity={0.5} strokeDasharray="4 3" label={{ value: "now", position: "insideTopRight", fontSize: 10, fill: "var(--color-muted-foreground)" }} />}

						<ChartTooltip
							content={tooltip => {
								if (!tooltip.active) return null;
								const key = tooltip.payload?.[0]?.payload?.key as string | undefined;
								// same snapped positions as the shading, so tooltip and shading always agree
								const active = key ? programs.filter(program => key >= program.start && key <= program.end) : [];

								return (
									<div className="grid gap-1.5">
										<ChartTooltipContent
											{...(tooltip as React.ComponentProps<typeof ChartTooltipContent>)}
											indicator="line"
											className="min-w-44"
											labelFormatter={(_, payload) => {
												const rowKey = payload?.[0]?.payload?.key as string | undefined;
												if (!rowKey) return "";
												const local = localClock(demand.date, rowKey, timezone);
												return `${zuluLabel(rowKey)}${mode === "hourly" ? " hour" : ""}${local ? ` · ${local}` : ""}`;
											}}
										/>
										{active.length > 0 && (
											<ProgramNotes programs={active} demand={demand} timezone={timezone} isToday={isToday} now={now} />
										)}
									</div>
								);
							}}
						/>

						<Bar dataKey="onTime" stackId="a" fill="var(--color-onTime)" />
						<Bar dataKey="delayed" stackId="a" fill="var(--color-delayed)" />
						<Bar dataKey="irregular" stackId="a" fill="var(--color-irregular)" radius={[2, 2, 0, 0]} />
						<Line
							dataKey="capacity"
							type="stepAfter"
							stroke="var(--color-capacity)"
							strokeWidth={2}
							strokeDasharray={demand.aarSource === "recorded" ? undefined : "5 4"}
							dot={false}
							connectNulls={false}
							isAnimationActive={false}
						/>
					</ComposedChart>
				</ChartContainer>
			</div>

			<ChartLegend
				items={[
					{ label: "On time", color: "var(--color-green-400)" },
					{ label: "Delayed / EDCT", color: "var(--color-yellow-400)" },
					{ label: "Irregular", color: "var(--color-red-400)" },
					{ label: demand.aarSource === "recorded" ? "AAR" : "AAR (approx.)", color: "var(--color-sky-500)", dashed: demand.aarSource !== "recorded" },
					...(programs.length ? [{ label: "Program window", color: "var(--color-red-500)" }] : []),
				]}
			/>

			{programs.length > 0 && (
				<div className="px-3 pb-2 text-xs text-muted-foreground">
					{programs.map(program => program.label).filter((v, i, a) => a.indexOf(v) === i).join(", ")} shaded from when Skywatch first saw each program on {formatDay(demand.date)}.
				</div>
			)}
			{aarNote && <div className="px-3 pb-2 text-xs text-muted-foreground">{aarNote}</div>}
		</div>
	);
};

type ActiveProgram = TrafficDemand["programs"][number] & { label: string; color: string };

/** Programs in effect for the hovered bucket, shown under the normal tooltip rows. */
const ProgramNotes: React.FC<{
	programs: ActiveProgram[];
	demand: TrafficDemand;
	timezone: string | null;
	isToday: boolean;
	now: number;
}> = ({ programs, demand, timezone, isToday, now }) => (
	<div className="grid gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
		{programs.map(program => {
			const since = instantLabel(program.firstSeen, demand.date, timezone);
			const until = program.resolvedAt ? instantLabel(program.resolvedAt, demand.date, timezone) : null;
			const minutes = Math.max(0, Math.round(((program.resolvedAt ? Date.parse(program.resolvedAt) : now) - Date.parse(program.firstSeen)) / 60000));

			return (
				<div key={`${program.type}-${program.firstSeen}`} className="grid gap-0.5">
					<div className="flex items-center gap-1.5 font-medium">
						<span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: program.color }} />
						{program.label}
					</div>
					<div className="text-muted-foreground">
						First seen <span className="font-mono text-foreground">{since.zulu}</span>{since.local && <> · {since.local}</>}
					</div>
					<div className="text-muted-foreground">
						{until
							? <>Until <span className="font-mono text-foreground">{until.zulu}</span>{until.local && <> · {until.local}</>}</>
							: isToday ? "Ongoing" : "No end recorded"}
						{(until || isToday) && <> · <span className="font-mono text-foreground">{formatDuration(minutes)}</span></>}
					</div>
				</div>
			);
		})}
	</div>
);
