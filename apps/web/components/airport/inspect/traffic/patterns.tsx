"use client";

import { useMemo, useState } from "react";
import { cn } from "cnfast";
import { ReferenceCard } from "../reference/primitives";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";

import {
	ChartLegend,
	Query,
	QueryBody,
	TrafficDemand,
	TrafficHistory,
	WEEKDAYS,
	formatDay,
	hourLabel,
	zuluLabel
} from "./shared";

type CardProps = { className?: string };

/** The selected day's arrivals per 15 minutes against the average of earlier days with the same Zulu weekday. */
export const TypicalDayCard: React.FC<CardProps & { history: Query<TrafficHistory>; demand: Query<TrafficDemand> }> = ({
	history, demand, className
}) => {
	const weekday = history.data?.typical ? WEEKDAYS[history.data.typical.isoWeekday % 7] : null;

	return (
		<ReferenceCard
			title={weekday ? `Selected day vs typical ${weekday}` : "Selected day vs typical"}
			meta={history.data?.typical ? `${history.data.typical.sampleDays} days` : undefined}
			className={className}
		>
			<QueryBody query={history} height={260} title="Couldn't load history">
				{data => <TypicalChart history={data} demand={demand.data} weekday={weekday} />}
			</QueryBody>
		</ReferenceCard>
	);
};

const TypicalChart: React.FC<{ history: TrafficHistory; demand: TrafficDemand | undefined; weekday: string | null }> = ({
	history, demand, weekday
}) => {
	const rows = useMemo(() => {
		if (!history.typical) return [];
		const actual = new Map(demand?.buckets.map(b => [b.time, b.total]));
		return history.typical.points.map(point => ({
			time: point.time,
			typical: point.avg,
			selected: actual.get(point.time) ?? null
		}));
	}, [history, demand]);

	if (!history.typical) return (
		<div className="px-3 py-10 text-center text-sm text-muted-foreground">
			Not enough history yet. This needs at least one earlier complete {weekday ?? "same-weekday"} for this airport.
		</div>
	);

	const config = {
		selected: { label: "Selected day", color: "var(--color-green-400)" },
		typical: { label: `Typical ${weekday ?? ""}`.trim(), color: "var(--color-zinc-400)" },
	} satisfies ChartConfig;

	return (
		<div>
			<div className="px-2 pt-3">
				<ChartContainer config={config} className="aspect-auto h-[230px] w-full">
					<LineChart data={rows} margin={{ left: 0, right: 8, top: 4 }} accessibilityLayer>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis dataKey="time" tickLine={false} axisLine={false} interval={11} tickFormatter={(time: string) => hourLabel(time)} />
						<YAxis width={30} axisLine={false} tickLine={false} allowDecimals={false} />
						<ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(label: string) => zuluLabel(label)} />} />
						<Line dataKey="typical" type="monotone" stroke="var(--color-typical)" strokeWidth={1.75} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
						<Line dataKey="selected" type="monotone" stroke="var(--color-selected)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
					</LineChart>
				</ChartContainer>
			</div>
			<ChartLegend items={[
				{ label: "Selected day", color: "var(--color-green-400)" },
				{ label: `Typical ${weekday} (average of ${history.typical.sampleDays})`, color: "var(--color-zinc-400)", dashed: true },
			]} />
		</div>
	);
};

/** Average arrivals per local clock hour, by local weekday: when this airport is busy. */
export const HeatmapCard: React.FC<CardProps & { query: Query<TrafficHistory> }> = ({ query, className }) => (
	<ReferenceCard title="Weekly pattern" meta={query.data ? `${query.data.heatmap.sampleDays} days` : undefined} className={className}>
		<QueryBody query={query} height={260} title="Couldn't load the weekly pattern">
			{history => <Heatmap history={history} />}
		</QueryBody>
	</ReferenceCard>
);

// Monday first
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

type HoveredCell = {
	dow: number;
	hour: number;
	cell: TrafficHistory["heatmap"]["cells"][number] | undefined;
	x: number;
	y: number;
};

const hourRange = (hour: number) =>
	`${hour.toString().padStart(2, "0")}:00–${((hour + 1) % 24).toString().padStart(2, "0")}:00`;

const Heatmap: React.FC<{ history: TrafficHistory }> = ({ history }) => {
	const { cells, sampleDays } = history.heatmap;
	const [hovered, setHovered] = useState<HoveredCell | null>(null);
	if (!cells.length) return (
		<div className="px-3 py-10 text-center text-sm text-muted-foreground">Not enough complete days yet.</div>
	);

	const byKey = new Map(cells.map(cell => [`${cell.dow}-${cell.hour}`, cell]));
	const max = Math.max(1, ...cells.map(cell => cell.avg));

	return (
		<div className="px-3 pb-3 pt-3">
			<div className="grid gap-px" style={{ gridTemplateColumns: "2.25rem repeat(24, minmax(0, 1fr))" }}>
				<div />
				{Array.from({ length: 24 }, (_, hour) => (
					<div key={hour} className="text-center text-[10px] text-muted-foreground">
						{hour % 3 === 0 ? hour : ""}
					</div>
				))}

				{DOW_ORDER.map(dow => (
					<div key={dow} className="contents">
						<div className="pr-1 text-right text-[11px] leading-6 text-muted-foreground">{WEEKDAYS[dow].slice(0, 3)}</div>
						{Array.from({ length: 24 }, (_, hour) => {
							const cell = byKey.get(`${dow}-${hour}`);
							const strength = cell ? cell.avg / max : 0;
							return (
								<div
									key={hour}
									onMouseMove={e => setHovered({ dow, hour, cell, x: e.clientX, y: e.clientY })}
									onMouseLeave={() => setHovered(null)}
									className={cn("h-6 rounded-[2px] transition-opacity hover:opacity-80", !cell && "bg-muted/40")}
									style={cell ? { background: `color-mix(in oklab, var(--color-sky-500) ${Math.round(strength * 100)}%, var(--color-muted))` } : undefined}
								/>
							);
						})}
					</div>
				))}
			</div>

			<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
				<span>Hour of day, {history.timezone ?? "UTC"} (local){history.timezone ? "" : " · timezone unknown"}</span>
				<span className="inline-flex items-center gap-1.5">
					fewer
					<span className="inline-block h-2 w-16 rounded-sm" style={{ background: "linear-gradient(to right, var(--color-muted), var(--color-sky-500))" }} />
					more
				</span>
			</div>
			<div className="mt-1 text-xs text-muted-foreground">Average arrivals per hour over {sampleDays} complete days.</div>

			{hovered && <HeatmapTooltip hovered={hovered} max={max} />}
		</div>
	);
};

/** Cursor-following tooltip in the same style as the treemap tooltips. Flips left near the right edge. */
const HeatmapTooltip: React.FC<{ hovered: HoveredCell; max: number }> = ({ hovered, max }) => {
	const { dow, hour, cell, x, y } = hovered;
	const nearRightEdge = x > window.innerWidth - 240;

	return (
		<div
			className="fixed z-50 pointer-events-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl"
			style={{
				left: nearRightEdge ? x - 16 : x + 16,
				top: y + 16,
				transform: nearRightEdge ? "translateX(-100%)" : undefined
			}}
		>
			<div className="flex flex-col">
				<div className="text-white font-mono font-bold text-sm mb-1">
					{WEEKDAYS[dow]} {hourRange(hour)}
				</div>
				{cell ? (
					<>
						<div className="text-gray-300 text-sm">
							Avg arrivals:{" "}
							<span className="font-semibold text-white">{cell.avg.toFixed(0)}</span>
						</div>
						<div className="text-gray-300 text-sm">
							Days sampled:{" "}
							<span className="font-semibold text-white">{cell.samples}</span>
						</div>
						<div className="text-gray-400 text-xs mt-1">
							{((cell.avg / max) * 100).toFixed(0)}% of this airport&apos;s busiest hour
						</div>
					</>
				) : (
					<div className="text-gray-400 text-sm">No data</div>
				)}
			</div>
		</div>
	);
};

/** Daily volume across the history window. Click a bar to jump to that day. */
export const TrendCard: React.FC<CardProps & { query: Query<TrafficHistory>; onSelect: (date: string) => void }> = ({
	query, onSelect, className
}) => (
	<ReferenceCard title="Daily arrivals" meta={query.data ? `${query.data.days.length} days` : undefined} className={className}>
		<QueryBody query={query} height={220} title="Couldn't load daily arrivals">
			{history => <Trend history={history} onSelect={onSelect} />}
		</QueryBody>
	</ReferenceCard>
);

const Trend: React.FC<{ history: TrafficHistory; onSelect: (date: string) => void }> = ({ history, onSelect }) => {
	const rows = history.days.map(day => ({
		date: day.date,
		flown: Math.max(0, day.total - day.cancelled),
		cancelled: day.cancelled,
		complete: day.complete
	}));

	const config = {
		flown: { label: "Scheduled", color: "var(--color-green-400)" },
		cancelled: { label: "Cancelled", color: "var(--color-red-400)" },
	} satisfies ChartConfig;

	return (
		<div>
			<div className="px-2 pt-3">
				<ChartContainer config={config} className="aspect-auto h-[190px] w-full">
					<BarChart
						data={rows}
						margin={{ left: 0, right: 8, top: 4 }}
						accessibilityLayer
						onClick={state => {
							const date = state?.activePayload?.[0]?.payload?.date as string | undefined;
							if (date) onSelect(date);
						}}
					>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(date: string) => date.slice(5)} />
						<YAxis width={38} axisLine={false} tickLine={false} allowDecimals={false} />
						<ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(label: string) => formatDay(label)} />} />
						{/* fill on the Bar (not just its Cells) is what the tooltip reads for its color indicator */}
						<Bar dataKey="flown" stackId="a" fill="var(--color-flown)" cursor="pointer">
							{rows.map(row => (
								<Cell
									key={row.date}
									fill="var(--color-flown)"
									fillOpacity={row.date === history.date ? 1 : row.complete ? 0.55 : 0.25}
									stroke={row.date === history.date ? "var(--color-foreground)" : undefined}
								/>
							))}
						</Bar>
						<Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" cursor="pointer" radius={[2, 2, 0, 0]}>
							{rows.map(row => (
								<Cell key={row.date} fill="var(--color-cancelled)" fillOpacity={row.date === history.date ? 1 : row.complete ? 0.55 : 0.25} />
							))}
						</Bar>
					</BarChart>
				</ChartContainer>
			</div>
			<div className="px-3 pb-2 text-xs text-muted-foreground">
				FAA scheduled totals per Zulu day. Faded bars are partial days. The selected day is outlined.
			</div>
		</div>
	);
};
