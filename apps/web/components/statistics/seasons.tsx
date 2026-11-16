"use client";

import moment from "moment-timezone";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceArea, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";
import { ROWS } from "./disruptions";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	useSeasons,
	type StatsSeasons
} from "./shared";

type Kind = "closure" | "ground_stop" | "ground_delay" | "delay";

const COLORS = Object.fromEntries(ROWS.map(row => [row.kind, row.color])) as Record<Kind, string>;
const LABELS = Object.fromEntries(ROWS.map(row => [row.kind, row.label])) as Record<Kind, string>;

// The ones that stop flights sit at the bottom, where they can be compared; the pale delays, of which there are far more, on top.
const STACK: Kind[] = ["ground_stop", "ground_delay", "closure", "delay"];

const config = Object.fromEntries(STACK.map(kind => [kind, { label: LABELS[kind], color: COLORS[kind] }])) as ChartConfig;

const monthName = (month: string) => moment.utc(`${month}-01`).format("MMMM");

const Chart: React.FC<{ seasons: StatsSeasons }> = ({ seasons }) => {
	const model = useMemo(() => {
		// months that were there from the first day to the last: the first and the current one are partial and would mislead
		const full = seasons.months.filter(month => !month.partial);
		const stops = full.map(month => ({ month: month.month, stops: month.ground_stop }));
		const peak = stops.reduce((best, month) => month.stops > best.stops ? month : best, stops[0]);
		const quiet = stops.reduce((best, month) => month.stops < best.stops ? month : best, stops[0]);

		// a tick over the first week of each month
		const ticks = seasons.weeks
			.filter((week, index) => index === 0 || moment.utc(week.week).month() !== moment.utc(seasons.weeks[index - 1].week).month())
			.map(week => week.week);

		const peakWeeks = peak ? seasons.weeks.filter(week => moment.utc(week.week).add(3, "days").format("YYYY-MM") === peak.month) : [];

		return { peak, quiet, ticks, peakFrom: peakWeeks[0]?.week, peakTo: peakWeeks[peakWeeks.length - 1]?.week };
	}, [seasons]);

	if (!model.peak || !model.quiet) return <Note>Not enough history yet.</Note>;

	const ratio = model.quiet.stops > 0 ? model.peak.stops / model.quiet.stops : 0;

	return (
		<div>
			<Takeaway>
				<Term of="groundStop">Ground stops</Term> have a season: <Num>{monthName(model.peak.month)}</Num> had <Num>{model.peak.stops.toLocaleString()}</Num>,
				{ratio >= 1.5 && <> about <Num>{ratio.toFixed(1)}×</Num> as many as {monthName(model.quiet.month)}&apos;s <Num>{model.quiet.stops.toLocaleString()}</Num></>}
				{ratio < 1.5 && <> close to {monthName(model.quiet.month)}&apos;s <Num>{model.quiet.stops.toLocaleString()}</Num></>}.
			</Takeaway>

			<ChartContainer config={config} className="aspect-auto h-[280px] w-full">
				<BarChart data={seasons.weeks} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap={1} accessibilityLayer>
					<CartesianGrid vertical={false} strokeDasharray="3 3" />
					<XAxis
						dataKey="week"
						ticks={model.ticks}
						interval={0}
						tickLine={false}
						axisLine={false}
						tickFormatter={(week: string) => moment.utc(week).format("MMM")}
					/>
					<YAxis width={40} axisLine={false} tickLine={false} allowDecimals={false} />
					<ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(week: string) => `Week of ${moment.utc(week).format("MMM D")}`} />} />

					{model.peakFrom && model.peakTo && (
						<ReferenceArea x1={model.peakFrom} x2={model.peakTo} fill="var(--color-foreground)" fillOpacity={0.05} ifOverflow="visible" />
					)}

					{STACK.map(kind => (
						<Bar key={kind} dataKey={kind} stackId="weeks" fill={`var(--color-${kind})`} isAnimationActive={false}>
							{seasons.weeks.map(week => <Cell key={week.week} fill={`var(--color-${kind})`} fillOpacity={week.partial ? 0.35 : 0.9} />)}
						</Bar>
					))}
				</BarChart>
			</ChartContainer>

			<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
				{STACK.map(kind => (
					<span key={kind} className="inline-flex items-center gap-1.5">
						<span className="size-2.5 rounded-[2px]" style={{ background: COLORS[kind] }} />
						{LABELS[kind]}
					</span>
				))}
				<span className="inline-flex items-center gap-1.5">
					<span className="h-2.5 w-3 rounded-[2px] bg-foreground/10" />
					busiest month
				</span>
			</div>

			<Note>
				Everything that began in each week since {moment.utc(seasons.since).format("MMM D")}, when the history starts. Faded bars are weeks only partly
				covered. The comparison uses full months only.
			</Note>
		</div>
	);
};

export const SeasonsFigure: React.FC = () => {
	const query = useSeasons();

	return (
		<Figure kicker="Through the seasons">
			<FigureBody query={query} height={380} title="Couldn't load the year">
				{seasons => <Chart seasons={seasons} />}
			</FigureBody>
		</Figure>
	);
};
